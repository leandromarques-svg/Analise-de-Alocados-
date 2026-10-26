import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: {
      id: `user_smoke_${stamp}`,
      username: `smoke_${stamp}`,
      role: 'RH',
      password: 'x',
      logs: {
        create: {
          id: `log_smoke_${stamp}`,
          author: 'Sistema',
          action: 'Smoke',
          details: 'F-001 smoke test',
        },
      },
    },
    include: { logs: true },
  });

  const employee = await prisma.employee.create({
    data: {
      id: Number(`${stamp}`.slice(-6)),
      nome: 'Smoke Test',
      isAtivo: true,
      grupoEconomico: 'Grupo Smoke',
    },
  });

  const assignment = await prisma.commercialAssignment.create({
    data: {
      id: `ca_smoke_${stamp}`,
      comercial: 'SmokeCom',
      nomeCliente: 'Cliente X',
      grupoEconomico: 'Grupo Smoke',
    },
  });

  const counts = {
    users: await prisma.user.count(),
    userLogs: await prisma.userLog.count(),
    employees: await prisma.employee.count(),
    commercial: await prisma.commercialAssignment.count(),
  };

  console.log(
    JSON.stringify(
      {
        ok: true,
        user: user.username,
        logs: user.logs.length,
        employeeId: employee.id,
        comercial: assignment.comercial,
        counts,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
