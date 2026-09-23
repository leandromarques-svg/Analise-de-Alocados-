import { prisma } from './prisma.ts';
import { toFuncionario } from './presenters.ts';

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export type AlocadosPayload = {
  success: true;
  source: 'sql' | 'cache';
  fetchedAt: string;
  cached: boolean;
  total: number;
  data: ReturnType<typeof toFuncionario>[];
};

let memory: { payload: AlocadosPayload; storedAt: number } | null = null;
let inflight: Promise<AlocadosPayload> | null = null;

function ttlMs(): number {
  const raw = Number(process.env.ALOCADOS_CACHE_TTL_MS);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return DEFAULT_TTL_MS;
}

async function readSql(): Promise<AlocadosPayload> {
  const started = Date.now();
  const rows = await prisma.employee.findMany({ orderBy: { id: 'asc' } });
  const data = rows.map(toFuncionario);
  const payload: AlocadosPayload = {
    success: true,
    source: 'sql',
    fetchedAt: new Date().toISOString(),
    cached: false,
    total: data.length,
    data,
  };
  memory = { payload, storedAt: Date.now() };
  console.log(`[METARH alocados] SQL ${Date.now() - started}ms, ${data.length} linhas`);
  return payload;
}

function startRead(): Promise<AlocadosPayload> {
  if (!inflight) {
    inflight = readSql().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function getAlocados(refresh: boolean): Promise<AlocadosPayload> {
  const now = Date.now();
  const fresh = memory != null && now - memory.storedAt < ttlMs();

  if (!refresh && fresh && memory) {
    const ageSec = Math.round((now - memory.storedAt) / 1000);
    console.log(`[METARH alocados] cache hit, ${memory.payload.total} linhas, idade ${ageSec}s`);
    return Promise.resolve({ ...memory.payload, source: 'cache', cached: true });
  }

  if (!refresh && memory) {
    void startRead().catch((err) => console.error('[METARH alocados] atualização em segundo plano', err));
    console.log(`[METARH alocados] cache vencido, devolvendo ${memory.payload.total} linhas e atualizando`);
    return Promise.resolve({ ...memory.payload, source: 'cache', cached: true });
  }

  return startRead();
}

export function warmAlocadosCache() {
  console.log('[METARH alocados] aquecendo cache');
  void getAlocados(false).catch((err) => console.error('[METARH alocados] aquecimento', err));
}
