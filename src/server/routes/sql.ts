import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.ts';
import { toAppUser } from '../presenters.ts';

const router = Router();

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function prismaError(res: any, err: any) {
  console.error('[SQL API]', err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Registro duplicado', code: err.code });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Registro não encontrado', code: err.code });
    }
  }
  if (err?.name === 'PrismaClientInitializationError') {
    return res.status(503).json({
      success: false,
      error: 'Banco indisponível. Verifique DATABASE_URL e se o SQL Server está no ar.',
      code: 'DB_UNAVAILABLE',
    });
  }
  return res.status(500).json({
    success: false,
    error: err?.message || 'Erro interno',
    code: 'INTERNAL',
  });
}

router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return res.json({ success: true, database: 'up', schema: 'alocados' });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password ?? '');
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'username e password são obrigatórios',
        code: 'VALIDATION',
      });
    }

    const rows = await prisma.user.findMany({
      include: { logs: { take: 5, orderBy: { timestamp: 'desc' } } },
    });
    const found = rows.find((row) => row.username.trim().toLowerCase() === username.toLowerCase());
    if (!found || (found.password ?? '') !== password) {
      return res.status(401).json({
        success: false,
        error: 'Usuário ou senha incorretos',
        code: 'INVALID_CREDENTIALS',
      });
    }

    return res.json({ success: true, data: toAppUser(found) });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.get('/users', async (_req, res) => {
  try {
    const data = await prisma.user.findMany({
      orderBy: { username: 'asc' },
      include: { logs: { take: 5, orderBy: { timestamp: 'desc' } } },
    });
    return res.json({ success: true, total: data.length, data });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.post('/users', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const role = String(req.body?.role || 'Colaborador').trim();
    if (!username) {
      return res.status(400).json({ success: false, error: 'username é obrigatório', code: 'VALIDATION' });
    }

    const data = await prisma.user.create({
      data: {
        id: String(req.body?.id || newId('user')),
        username,
        password: req.body?.password ? String(req.body.password) : null,
        role,
        grupoEconomico: req.body?.grupoEconomico ? String(req.body.grupoEconomico) : null,
        gruposEconomicosJson: req.body?.gruposEconomicos
          ? JSON.stringify(req.body.gruposEconomicos)
          : null,
        clientesAtribuidosJson: req.body?.clientesAtribuidos
          ? JSON.stringify(req.body.clientesAtribuidos)
          : null,
        cnpjsAtribuidosJson: req.body?.cnpjsAtribuidos
          ? JSON.stringify(req.body.cnpjsAtribuidos)
          : null,
        email: req.body?.email ? String(req.body.email) : null,
        phone: req.body?.phone ? String(req.body.phone) : null,
        logs: req.body?.log
          ? {
              create: {
                id: newId('log'),
                author: String(req.body.log.author || 'Sistema'),
                action: String(req.body.log.action || 'Criação'),
                details: req.body.log.details ? String(req.body.log.details) : null,
              },
            }
          : undefined,
      },
      include: { logs: true },
    });

    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.get('/user-logs', async (req, res) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const data = await prisma.userLog.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return res.json({ success: true, total: data.length, data });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.get('/employees', async (req, res) => {
  try {
    const take = Math.min(Number(req.query.limit || 50), 500);
    const data = await prisma.employee.findMany({
      take,
      orderBy: { id: 'asc' },
    });
    const total = await prisma.employee.count();
    return res.json({ success: true, total, data });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.post('/employees', async (req, res) => {
  try {
    const id = Number(req.body?.id);
    const nome = String(req.body?.nome || '').trim();
    if (!Number.isFinite(id) || !nome) {
      return res.status(400).json({
        success: false,
        error: 'id (número) e nome são obrigatórios',
        code: 'VALIDATION',
      });
    }

    const data = await prisma.employee.create({
      data: {
        id,
        nome,
        vinculo: req.body?.vinculo ? String(req.body.vinculo) : null,
        telefone: req.body?.telefone ? String(req.body.telefone) : null,
        dataAdmissao: req.body?.dataAdmissao ? new Date(req.body.dataAdmissao) : null,
        dataVctoContrato: req.body?.dataVctoContrato
          ? new Date(req.body.dataVctoContrato)
          : null,
        dataVctoProrrogacao: req.body?.dataVctoProrrogacao
          ? new Date(req.body.dataVctoProrrogacao)
          : null,
        dataDemissao: req.body?.dataDemissao ? new Date(req.body.dataDemissao) : null,
        anoAdmissao: req.body?.anoAdmissao != null ? Number(req.body.anoAdmissao) : null,
        anoProrrogacao: req.body?.anoProrrogacao != null ? Number(req.body.anoProrrogacao) : null,
        anoDemissao: req.body?.anoDemissao != null ? Number(req.body.anoDemissao) : null,
        isAtivo: req.body?.isAtivo !== false && req.body?.isAtivo !== 'false',
        salario:
          req.body?.salario !== undefined && req.body?.salario !== null
            ? new Prisma.Decimal(req.body.salario)
            : null,
        cargo: req.body?.cargo ? String(req.body.cargo) : null,
        depto: req.body?.depto ? String(req.body.depto) : null,
        empresa:
          req.body?.empresa !== undefined && req.body?.empresa !== null && req.body?.empresa !== ''
            ? Number(req.body.empresa)
            : null,
        regiao: req.body?.regiao ? String(req.body.regiao) : null,
        cidade: req.body?.cidade ? String(req.body.cidade) : null,
        uf: req.body?.uf ? String(req.body.uf) : null,
        motivoDesligamento: req.body?.motivoDesligamento
          ? String(req.body.motivoDesligamento)
          : null,
        emailCorporativo: req.body?.emailCorporativo
          ? String(req.body.emailCorporativo)
          : null,
        celular: req.body?.celular ? String(req.body.celular) : null,
        codCliente:
          req.body?.codCliente !== undefined && req.body?.codCliente !== null
            ? Number(req.body.codCliente)
            : null,
        nomeCliente: req.body?.nomeCliente ? String(req.body.nomeCliente) : null,
        cnpjCliente: req.body?.cnpjCliente ? String(req.body.cnpjCliente) : null,
        departamento: req.body?.departamento ? String(req.body.departamento) : null,
        rhFocal: req.body?.rhFocal ? String(req.body.rhFocal) : null,
        grupoEconomico: req.body?.grupoEconomico ? String(req.body.grupoEconomico) : null,
      },
    });

    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.get('/commercial-assignments', async (_req, res) => {
  try {
    const data = await prisma.commercialAssignment.findMany({
      orderBy: { comercial: 'asc' },
    });
    return res.json({ success: true, total: data.length, data });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

router.post('/commercial-assignments', async (req, res) => {
  try {
    const comercial = String(req.body?.comercial || '').trim();
    if (!comercial) {
      return res.status(400).json({
        success: false,
        error: 'comercial é obrigatório',
        code: 'VALIDATION',
      });
    }

    const data = await prisma.commercialAssignment.create({
      data: {
        id: String(req.body?.id || newId('ca')),
        comercial,
        grupoEconomico: req.body?.grupoEconomico ? String(req.body.grupoEconomico) : null,
        nomeCliente: req.body?.nomeCliente ? String(req.body.nomeCliente) : null,
      },
    });

    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return prismaError(res, err);
  }
});

export default router;
