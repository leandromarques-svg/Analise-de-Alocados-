const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxovla2YdYk7bIHs4_Z9L8G2N63OtDYrzCQhjAbNvC-Ia3TsLcnWp58bX4GU9RU220R/exec';

export default async function handler(req: any, res: any) {
  // CORS headers for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Google Apps Script returned ${response.status}`,
      });
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(502).json({
        success: false,
        error: 'Dados vazios ou inválidos retornados pela planilha Google.',
      });
    }

    // Return successfully with s-maxage caching header
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({
      success: true,
      source: 'live',
      fetchedAt: new Date().toISOString(),
      total: data.length,
      data: data,
    });
  } catch (err: any) {
    console.error('Vercel API /api/alocados error:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados da planilha do Google.',
      details: err.message,
    });
  }
}
