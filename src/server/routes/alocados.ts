import { Router } from 'express';
import { getAlocados } from '../alocadosCache.ts';

const router = Router();
const PAGE_SIZE = 4000;

router.get('/alocados', async (req, res) => {
  try {
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const updatedBy = String(req.query.by || '').trim() || 'Atualização automática';
    const offset = Math.max(0, Number.parseInt(String(req.query.offset ?? '0'), 10) || 0);
    const requested = Number.parseInt(String(req.query.limit ?? PAGE_SIZE), 10);
    const limit = Math.min(PAGE_SIZE, Math.max(1, Number.isFinite(requested) ? requested : PAGE_SIZE));
    const payload = await getAlocados(refresh, updatedBy);
    return res.json({
      ...payload,
      offset,
      limit,
      data: payload.data.slice(offset, offset + limit),
    });
  } catch (err: any) {
    console.error('[SQL alocados]', err);
    const unavailable = err?.name === 'PrismaClientInitializationError';
    return res.status(unavailable ? 503 : 500).json({
      success: false,
      error: unavailable
        ? 'Banco indisponível. Verifique DATABASE_URL e se o SQL Server está no ar.'
        : err?.message || 'Erro ao ler alocados',
      code: unavailable ? 'DB_UNAVAILABLE' : 'INTERNAL',
    });
  }
});

export default router;
