import { Router } from 'express';
import { getAlocados } from '../alocadosCache.ts';

const router = Router();

router.get('/alocados', async (req, res) => {
  try {
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const payload = await getAlocados(refresh);
    return res.json(payload);
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
