import { Router } from 'express';
import { prisma } from '../prisma.ts';
import { toAppUser } from '../presenters.ts';

const router = Router();

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function jsonOrNull(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

async function listUsers() {
  const rows = await prisma.user.findMany({
    orderBy: { username: 'asc' },
    include: { logs: { orderBy: { timestamp: 'desc' }, take: 20 } },
  });
  return rows.map(toAppUser);
}

async function findByUsername(username: string) {
  const needle = username.trim().toLowerCase();
  const rows = await prisma.user.findMany();
  return rows.find((row) => row.username.trim().toLowerCase() === needle) ?? null;
}

router.all('/users', async (req, res) => {
  try {
    const action = (req.query.action || req.body?.action || 'getUsers').toString();

    if (action === 'saveUser' || req.body?.user) {
      const userData = req.body?.user || req.body;
      const username = String(userData?.username || '').trim();
      if (!username) {
        return res.status(400).json({ success: false, error: 'username é obrigatório' });
      }

      const existing = await findByUsername(username);
      const payload = {
        username,
        password: userData.password != null ? String(userData.password) : null,
        role: String(userData.role || 'Colaborador'),
        grupoEconomico: userData.grupoEconomico ? String(userData.grupoEconomico) : null,
        gruposEconomicosJson: jsonOrNull(userData.gruposEconomicos),
        clientesAtribuidosJson: jsonOrNull(userData.clientesAtribuidos),
        cnpjsAtribuidosJson: jsonOrNull(userData.cnpjsAtribuidos),
        email: userData.email ? String(userData.email) : null,
        phone: userData.phone ? String(userData.phone) : null,
        updatedAt: new Date(),
      };

      const saved = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: payload,
            include: { logs: { orderBy: { timestamp: 'desc' }, take: 20 } },
          })
        : await prisma.user.create({
            data: {
              id: String(userData.id || newId('user')),
              ...payload,
            },
            include: { logs: { orderBy: { timestamp: 'desc' }, take: 20 } },
          });

      if (Array.isArray(userData.logs)) {
        for (const log of userData.logs) {
          if (!log?.id || !log?.action) continue;
          await prisma.userLog.upsert({
            where: { id: String(log.id) },
            update: {},
            create: {
              id: String(log.id),
              userId: saved.id,
              timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
              author: String(log.author || username),
              action: String(log.action),
              details: log.details ? String(log.details) : null,
            },
          });
        }
      }

      const users = await listUsers();
      return res.json({ success: true, user: toAppUser(saved), users });
    }

    if (action === 'deleteUser') {
      const usernameToDelete = String(req.query.username || req.body?.username || '').trim();
      const existing = usernameToDelete ? await findByUsername(usernameToDelete) : null;
      if (existing) {
        await prisma.user.delete({ where: { id: existing.id } });
      }
      const users = await listUsers();
      return res.json({ success: true, users });
    }

    const users = await listUsers();
    return res.json({ success: true, data: users, users });
  } catch (err: any) {
    console.error('[SQL users]', err);
    const unavailable = err?.name === 'PrismaClientInitializationError';
    return res.status(unavailable ? 503 : 500).json({
      success: false,
      error: err?.message || 'Erro ao ler usuários',
      users: [],
    });
  }
});

export default router;
