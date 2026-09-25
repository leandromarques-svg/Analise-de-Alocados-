import { Router } from 'express';
import { prisma } from '../prisma.ts';
import { toAssignment } from '../presenters.ts';

const router = Router();

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function newId() {
  return `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanGroup(value: string) {
  const lower = value.toLowerCase().trim();
  if (!value || lower === 'outros' || lower === 'sem grupo') return '';
  return value.trim();
}

router.all('/commercial-assignments', async (req, res) => {
  try {
    const action = (req.query.action || req.body?.action || 'getAssignments').toString();
    const comercialFilter = String(
      req.query.comercial || req.body?.comercial || req.query.username || req.body?.username || ''
    ).trim();

    if (action === 'saveAssignments' || (req.method === 'POST' && req.body?.comercial)) {
      const comercial = String(req.body?.comercial || req.body?.username || comercialFilter).trim();
      if (!comercial) {
        return res.status(400).json({ success: false, error: 'Usuário Comercial é obrigatório' });
      }

      const rows = await prisma.commercialAssignment.findMany();
      const comercialLower = comercial.toLowerCase();
      const owned = rows.filter((row) => row.comercial.trim().toLowerCase() === comercialLower);
      if (owned.length > 0) {
        await prisma.commercialAssignment.deleteMany({
          where: { id: { in: owned.map((row) => row.id) } },
        });
      }

      const creates: { id: string; grupoEconomico: string | null; nomeCliente: string | null; comercial: string }[] = [];
      const rawItems = req.body?.items;
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        for (const item of rawItems) {
          creates.push({
            id: newId(),
            grupoEconomico: cleanGroup(String(item['Grupo Economico'] || item.grupoEconomico || '')) || null,
            nomeCliente: String(item['Nome Cliente'] || item.nomeCliente || '').trim() || null,
            comercial,
          });
        }
      } else {
        const clientes = asList(req.body?.clientes);
        const grupos = asList(req.body?.grupos);
        const mappings: Record<string, string> = req.body?.mappings || {};
        if (clientes.length > 0) {
          for (const cliente of clientes) {
            creates.push({
              id: newId(),
              grupoEconomico: cleanGroup(String(mappings[cliente] || '')) || null,
              nomeCliente: cliente,
              comercial,
            });
          }
        } else {
          for (const grupo of grupos) {
            const cleaned = cleanGroup(grupo);
            if (!cleaned) continue;
            creates.push({ id: newId(), grupoEconomico: cleaned, nomeCliente: null, comercial });
          }
        }
      }

      if (creates.length > 0) {
        await prisma.commercialAssignment.createMany({ data: creates });
      }

      const allRows = await prisma.commercialAssignment.findMany({ orderBy: { comercial: 'asc' } });
      const all = allRows.map(toAssignment);
      const data = all.filter((item) => item.Comercial.trim().toLowerCase() === comercialLower);
      return res.json({ success: true, comercial, data, all });
    }

    const rows = await prisma.commercialAssignment.findMany({ orderBy: { comercial: 'asc' } });
    const all = rows.map(toAssignment);
    if (comercialFilter) {
      const comercialLower = comercialFilter.toLowerCase();
      const data = all.filter((item) => {
        const name = item.Comercial.trim().toLowerCase();
        return name === comercialLower || name.includes(comercialLower) || comercialLower.includes(name);
      });
      return res.json({ success: true, comercial: comercialFilter, data });
    }

    return res.json({ success: true, data: all });
  } catch (err: any) {
    console.error('[SQL carteira]', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao ler carteira',
      data: [],
    });
  }
});

export default router;
