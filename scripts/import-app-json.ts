import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/server/prisma.ts';

type JsonUser = {
  id?: string;
  username?: string;
  password?: string;
  role?: string;
  grupoEconomico?: string;
  gruposEconomicos?: unknown;
  clientesAtribuidos?: unknown;
  cnpjsAtribuidos?: unknown;
  email?: string;
  phone?: string;
  createdAt?: string;
  logs?: {
    id?: string;
    timestamp?: string;
    author?: string;
    action?: string;
    details?: string;
  }[];
};

type JsonAssignment = {
  'Grupo Economico'?: string;
  'Nome Cliente'?: string;
  Comercial?: string;
};

function readJson<T>(fileName: string): T {
  const filePath = path.join(process.cwd(), fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function jsonText(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return JSON.stringify(value);
}

function emptyToNull(value: unknown): string | null {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

async function importUsers() {
  const users = readJson<JsonUser[]>('metarh_users_db.json');
  let userCount = 0;
  let logCount = 0;

  for (const user of users) {
    const username = String(user.username || '').trim();
    if (!username) continue;

    const id = String(user.id || username).slice(0, 64);
    const data = {
      username,
      password: user.password != null ? String(user.password) : null,
      role: String(user.role || 'Colaborador'),
      grupoEconomico: emptyToNull(user.grupoEconomico),
      gruposEconomicosJson: jsonText(user.gruposEconomicos),
      clientesAtribuidosJson: jsonText(user.clientesAtribuidos),
      cnpjsAtribuidosJson: jsonText(user.cnpjsAtribuidos),
      email: emptyToNull(user.email),
      phone: emptyToNull(user.phone),
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
    };

    const saved = await prisma.user.upsert({
      where: { username },
      update: {
        password: data.password,
        role: data.role,
        grupoEconomico: data.grupoEconomico,
        gruposEconomicosJson: data.gruposEconomicosJson,
        clientesAtribuidosJson: data.clientesAtribuidosJson,
        cnpjsAtribuidosJson: data.cnpjsAtribuidosJson,
        email: data.email,
        phone: data.phone,
      },
      create: { id, ...data },
    });
    userCount += 1;

    for (const log of user.logs || []) {
      const rawId = String(log.id || '').trim();
      if (!rawId || !log.action) continue;
      const logId = (rawId.length < 8 ? `${saved.id}_${rawId}` : rawId).slice(0, 64);
      await prisma.userLog.upsert({
        where: { id: logId },
        update: {},
        create: {
          id: logId,
          userId: saved.id,
          timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
          author: String(log.author || 'Sistema').slice(0, 120),
          action: String(log.action).slice(0, 120),
          details: log.details ? String(log.details) : null,
        },
      });
      logCount += 1;
    }
  }

  return { userCount, logCount };
}

async function importAssignments() {
  const items = readJson<JsonAssignment[]>('metarh_commercial_assignments.json');
  const rows = items
    .map((item, index) => ({
      id: `asg_${String(index + 1).padStart(4, '0')}`,
      grupoEconomico: emptyToNull(item['Grupo Economico']),
      nomeCliente: emptyToNull(item['Nome Cliente']),
      comercial: String(item.Comercial || '').trim(),
    }))
    .filter((row) => row.comercial);

  await prisma.commercialAssignment.deleteMany();
  if (rows.length > 0) {
    await prisma.commercialAssignment.createMany({ data: rows });
  }
  return rows.length;
}

async function main() {
  const users = await importUsers();
  const assignments = await importAssignments();
  const [userTotal, assignmentTotal] = await Promise.all([
    prisma.user.count(),
    prisma.commercialAssignment.count(),
  ]);
  console.log(
    `[import] JSON usuários ${users.userCount}, logs ${users.logCount}, carteira ${assignments}`
  );
  console.log(`[import] Banco agora: users=${userTotal}, commercial_assignments=${assignmentTotal}`);
}

main()
  .catch((err) => {
    console.error('[import]', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
