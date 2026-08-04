import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
app.use(compression());
const PORT = 3000;

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxovla2YdYk7bIHs4_Z9L8G2N63OtDYrzCQhjAbNvC-Ia3TsLcnWp58bX4GU9RU220R/exec';
const DISK_CACHE_PATH = path.join(process.cwd(), 'metarh_cache_18k.json');

// In-memory cache for fast dashboard loading (serves 18,000+ records instantly)
let cachedData: any[] | null = null;
let lastFetchTime: number = 0;
let isFetchingInBackground: boolean = false;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

function loadDiskCache() {
  try {
    const pathsToTry = [
      DISK_CACHE_PATH,
      path.join(process.cwd(), 'public', 'metarh_cache_18k.json'),
    ];
    for (const cachePath of pathsToTry) {
      if (fs.existsSync(cachePath)) {
        const raw = fs.readFileSync(cachePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
          cachedData = parsed.data;
          lastFetchTime = parsed.fetchedAt ? new Date(parsed.fetchedAt).getTime() : Date.now();
          console.log(`[METARH Cache] Loaded ${cachedData.length} records from disk cache file (${cachePath}).`);
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[METARH Cache] Could not load disk cache:', err);
  }
}

function saveDiskCache(data: any[], fetchedAtIso: string) {
  try {
    const payload = {
      fetchedAt: fetchedAtIso,
      total: data.length,
      data: data
    };
    fs.writeFile(DISK_CACHE_PATH, JSON.stringify(payload), (err) => {
      if (err) console.warn('[METARH Cache] Error writing disk cache:', err);
      else console.log(`[METARH Cache] Saved ${data.length} records to disk cache.`);
    });
  } catch (err) {
    console.warn('[METARH Cache] Error saving disk cache:', err);
  }
}

async function fetchFromGoogleScript() {
  console.log('[METARH Sync] Initiating fetch from Google Apps Script...');
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json, text/plain, */*'
    },
    signal: AbortSignal.timeout(120000) // 2-minute timeout for large payload
  });

  if (!response.ok) {
    throw new Error(`Google Script HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Formato de dados inválido ou vazio retornado pelo Google Script');
  }

  console.log(`[METARH Sync] Successfully downloaded ${data.length} records from Google Apps Script.`);
  return data;
}

async function triggerBackgroundRefresh() {
  if (isFetchingInBackground) return;
  isFetchingInBackground = true;
  try {
    const freshData = await fetchFromGoogleScript();
    const now = Date.now();
    cachedData = freshData;
    lastFetchTime = now;
    saveDiskCache(freshData, new Date(now).toISOString());
  } catch (err: any) {
    console.error('[METARH Sync] Background refresh failed:', err.message);
  } finally {
    isFetchingInBackground = false;
  }
}

// Load disk cache immediately upon module initialization
loadDiskCache();

// If cache is empty or missing, start background fetch right away on server startup
if (!cachedData || cachedData.length === 0) {
  triggerBackgroundRefresh().catch((err) =>
    console.warn('[METARH Sync] Initial background fetch warning:', err.message)
  );
}

app.use(express.json({ limit: '100mb' }));

const APPS_SCRIPT_USER_URL = 'https://script.google.com/macros/s/AKfycbxvEbfCjw5prUCltIj5KWGzilUXsp-tu4fIA_ZYvr5WWJ0k4OoJL7SLOP1ZrnSCejV8/exec';

// API Route to handle users (proxy to Google Apps Script)
app.all('/api/users', async (req, res) => {
  try {
    const action = (req.query.action || req.body?.action || 'getUsers').toString();
    const params = new URLSearchParams();
    
    // Copy query params
    for (const [k, v] of Object.entries(req.query)) {
      params.append(k, String(v));
    }

    if (req.method === 'POST' && req.body) {
      for (const [k, v] of Object.entries(req.body)) {
        params.append(k, String(v));
      }
    }

    const targetUrl = `${APPS_SCRIPT_USER_URL}?${params.toString()}`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*'
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: 'Erro ao conectar ao Google Script' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('Error in /api/users proxy:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API Route to fetch allocated workers
app.get('/api/alocados', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();

  // If force refresh requested
  if (forceRefresh) {
    try {
      const freshData = await fetchFromGoogleScript();
      cachedData = freshData;
      lastFetchTime = now;
      saveDiskCache(freshData, new Date(now).toISOString());

      return res.json({
        success: true,
        source: 'live',
        fetchedAt: new Date(now).toISOString(),
        total: freshData.length,
        data: freshData
      });
    } catch (error: any) {
      console.error('Error on force refresh:', error.message);
      if (cachedData) {
        return res.json({
          success: true,
          source: 'cache',
          cachedAt: new Date(lastFetchTime).toISOString(),
          warning: 'Falha ao atualizar via Google Script. Usando versão em cache.',
          total: cachedData.length,
          data: cachedData
        });
      }
      return res.status(502).json({
        success: false,
        error: 'Não foi possível carregar os dados.',
        details: error.message
      });
    }
  }

  // If cache exists (from memory or disk), return immediately!
  if (cachedData && cachedData.length > 0) {
    // If cache is older than TTL, trigger background refresh asynchronously
    if (now - lastFetchTime > CACHE_TTL_MS) {
      triggerBackgroundRefresh();
    }

    return res.json({
      success: true,
      source: 'cache',
      cachedAt: new Date(lastFetchTime).toISOString(),
      total: cachedData.length,
      data: cachedData
    });
  }

  // If no cache present at all, fetch synchronously
  try {
    const freshData = await fetchFromGoogleScript();
    cachedData = freshData;
    lastFetchTime = now;
    saveDiskCache(freshData, new Date(now).toISOString());

    res.json({
      success: true,
      source: 'live',
      fetchedAt: new Date(now).toISOString(),
      total: freshData.length,
      data: freshData
    });
  } catch (error: any) {
    console.error('Error fetching from Google Script:', error.message);
    res.status(502).json({
      success: false,
      error: 'Não foi possível carregar os dados do Google Apps Script.',
      details: error.message
    });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[METARH Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

