/**
 * Ensures the SQL Server database exists before Prisma migrations.
 * Uses the same DATABASE_URL as Prisma (sqlserver://...).
 *
 * Usage: npm run db:ensure
 * Requires: SQL Server reachable (docker compose up -d)
 */
import 'dotenv/config';
import net from 'net';

function parseSqlServerUrl(url: string) {
  // sqlserver://host:port;database=...;user=...;password=...;encrypt=true;trustServerCertificate=true
  const withoutScheme = url.replace(/^sqlserver:\/\//i, '');
  const [hostPort, ...rest] = withoutScheme.split(';');
  const [host, portRaw] = hostPort.split(':');
  const params: Record<string, string> = {};
  for (const part of rest) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    params[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
  }
  return {
    host: host || 'localhost',
    port: Number(portRaw || 1433),
    database: params.database || 'alocados_db',
    user: params.user || params.uid || 'sa',
    password: params.password || params.pwd || '',
    encrypt: (params.encrypt || 'true').toLowerCase() !== 'false',
    trustServerCertificate:
      (params.trustservercertificate || 'false').toLowerCase() === 'true',
  };
}

async function waitForPort(host: string, port: number, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host, port }, () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
      socket.setTimeout(2000, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`SQL Server não respondeu em ${host}:${port} dentro de ${timeoutMs}ms`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL não definida. Copie .env.example para .env');
  }

  const cfg = parseSqlServerUrl(url);
  console.log(`[db:ensure] Aguardando SQL Server em ${cfg.host}:${cfg.port}...`);
  await waitForPort(cfg.host, cfg.port);
  console.log('[db:ensure] Porta aberta.');

  // Prefer docker exec sqlcmd when using local compose
  const { spawnSync } = await import('child_process');
  const db = cfg.database.replace(/'/g, "''");
  const sql = `
IF DB_ID(N'${db}') IS NULL
BEGIN
  CREATE DATABASE [${db.replace(/]/g, ']]')}];
END
`;

  const result = spawnSync(
    'docker',
    [
      'exec',
      'alocados-sqlserver',
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S',
      'localhost',
      '-U',
      cfg.user,
      '-P',
      cfg.password,
      '-C',
      '-Q',
      sql,
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    console.error(result.stdout || '');
    console.error(result.stderr || '');
    throw new Error(
      'Falha ao criar database via docker exec sqlcmd. Suba o container: npm run db:up'
    );
  }

  console.log(`[db:ensure] Database '${cfg.database}' garantido.`);
  console.log('[db:ensure] Próximo passo: npm run db:migrate');
}

main().catch((err) => {
  console.error('[db:ensure]', err.message || err);
  process.exit(1);
});
