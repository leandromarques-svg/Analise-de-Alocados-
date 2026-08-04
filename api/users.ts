const APPS_SCRIPT_USER_URL = 'https://script.google.com/macros/s/AKfycbxvEbfCjw5prUCltIj5KWGzilUXsp-tu4fIA_ZYvr5WWJ0k4OoJL7SLOP1ZrnSCejV8/exec';

export const maxDuration = 60;

export default async function handler(req: any, res: any) {
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
    const params = new URLSearchParams();
    
    // Merge query params
    if (req.query) {
      for (const [k, v] of Object.entries(req.query)) {
        if (v !== undefined && v !== null) {
          params.append(k, String(v));
        }
      }
    }

    // Merge body params if POST
    if (req.method === 'POST' && req.body) {
      for (const [k, v] of Object.entries(req.body)) {
        if (v !== undefined && v !== null) {
          params.append(k, String(v));
        }
      }
    }

    if (!params.has('action')) {
      params.append('action', 'getUsers');
    }

    const targetUrl = `${APPS_SCRIPT_USER_URL}?${params.toString()}`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Erro HTTP ${response.status} do Google Script`,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Vercel API /api/users error:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao sincronizar usuários com o Google Script.',
      details: err.message,
    });
  }
}
