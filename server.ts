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
        const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.data) ? parsed.data : null);
        if (list && list.length > 0) {
          cachedData = list;
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
const APPS_SCRIPT_CARTEIRA_URL = 'https://script.google.com/macros/s/AKfycbyAAGFPmP4QxDbhDLFaxvfgzKbVzFil21iSDhyXqo9dSeGweyGwBYPDPu9AaCMwz8-Yfw/exec';
const USERS_DB_PATH = path.join(process.cwd(), 'metarh_users_db.json');
const CARTEIRA_DB_PATH = path.join(process.cwd(), 'metarh_commercial_assignments.json');

let serverUsers: any[] = [];
let serverCarteira: Array<{ 'Grupo Economico': string; 'Nome Cliente': string; 'Comercial': string }> = [];

function loadServerCarteira() {
  try {
    if (fs.existsSync(CARTEIRA_DB_PATH)) {
      const raw = fs.readFileSync(CARTEIRA_DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        serverCarteira = parsed;
        console.log(`[METARH Carteira DB] Loaded ${serverCarteira.length} assignments from disk.`);
        return;
      }
    }
  } catch (err) {
    console.warn('[METARH Carteira DB] Error loading file:', err);
  }
}

function saveServerCarteira() {
  try {
    fs.writeFileSync(CARTEIRA_DB_PATH, JSON.stringify(serverCarteira, null, 2), 'utf8');
  } catch (err) {
    console.warn('[METARH Carteira DB] Error writing file:', err);
  }
}

loadServerCarteira();

function loadServerUsers() {
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const raw = fs.readFileSync(USERS_DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        serverUsers = parsed;
        console.log(`[METARH Users DB] Loaded ${serverUsers.length} users from server disk.`);
        return;
      }
    }
  } catch (err) {
    console.warn('[METARH Users DB] Error loading users file:', err);
  }

  // Initial Master Admin Leandro
  serverUsers = [
    {
      id: 'admin_leandro',
      username: 'Leandro',
      password: '@Pi#101412',
      role: 'Administrador',
      createdAt: new Date().toISOString(),
      logs: [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          author: 'Sistema',
          action: 'Criação de Conta',
          details: 'Conta Master Administrador ativada.',
        },
      ],
    },
  ];
  saveServerUsers();
}

function saveServerUsers() {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(serverUsers, null, 2), 'utf8');
  } catch (err) {
    console.warn('[METARH Users DB] Error writing users file:', err);
  }
}

loadServerUsers();

async function triggerGoogleScriptUserSync(query: any, body: any) {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query || {})) {
      params.append(k, String(v));
    }
    if (body && typeof body === 'object') {
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          params.append(k, String(v));
        }
      }
    }
    const targetUrl = `${APPS_SCRIPT_USER_URL}?${params.toString()}`;
    await fetch(targetUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  } catch (e) {
    // ignore background sync errors
  }
}

// API Route to handle users with server-side JSON persistence
app.all('/api/users', async (req, res) => {
  try {
    const action = (req.query.action || req.body?.action || 'getUsers').toString();

    if (action === 'saveUser' || req.body?.user) {
      const userData = req.body?.user || req.body;
      if (userData && userData.username) {
        const unameLower = String(userData.username).trim().toLowerCase();
        const existingIdx = serverUsers.findIndex(
          (u) => String(u.username).trim().toLowerCase() === unameLower
        );

        if (existingIdx >= 0) {
          serverUsers[existingIdx] = {
            ...serverUsers[existingIdx],
            ...userData,
            updatedAt: new Date().toISOString(),
          };
        } else {
          serverUsers.push({
            ...userData,
            id: userData.id || String(Date.now()),
            createdAt: userData.createdAt || new Date().toISOString(),
          });
        }
        saveServerUsers();
        console.log(`[METARH Users DB] Saved user '${userData.username}' to server database.`);

        // Asynchronously sync to Google Apps Script as fallback
        triggerGoogleScriptUserSync(req.query, req.body);

        return res.json({ success: true, user: userData, users: serverUsers });
      }
    }

    if (action === 'deleteUser') {
      const usernameToDelete = (req.query.username || req.body?.username || '').toString().trim().toLowerCase();
      if (usernameToDelete) {
        serverUsers = serverUsers.filter(
          (u) => String(u.username).trim().toLowerCase() !== usernameToDelete
        );
        saveServerUsers();
        console.log(`[METARH Users DB] Deleted user '${usernameToDelete}' from server database.`);

        // Asynchronously sync to Google Apps Script as fallback
        triggerGoogleScriptUserSync(req.query, req.body);

        return res.json({ success: true, users: serverUsers });
      }
    }

    // Default action: getUsers
    // Ensure Leandro exists
    const hasLeandro = serverUsers.some((u) => String(u.username).toLowerCase() === 'leandro');
    if (!hasLeandro) {
      serverUsers.unshift({
        id: 'admin_leandro',
        username: 'Leandro',
        password: '@Pi#101412',
        role: 'Administrador',
        createdAt: new Date().toISOString(),
      });
      saveServerUsers();
    }

    return res.json({ success: true, data: serverUsers, users: serverUsers });
  } catch (err: any) {
    console.error('Error in /api/users handler:', err);
    return res.status(500).json({ success: false, error: err.message, users: serverUsers });
  }
});

// API Route for Commercial Assignments (Grupo Economico, Nome Cliente, Comercial)
app.all('/api/commercial-assignments', async (req, res) => {
  try {
    const action = (req.query.action || req.body?.action || 'getAssignments').toString();
    const comercialFilter = (req.query.comercial || req.body?.comercial || req.query.username || req.body?.username || '').toString().trim();

    if (action === 'saveAssignments' || req.method === 'POST') {
      const comercial = (req.body?.comercial || req.body?.username || comercialFilter).trim();
      if (!comercial) {
        return res.status(400).json({ success: false, error: 'Usuário Comercial é obrigatório' });
      }

      const comercialLower = comercial.toLowerCase();
      // Remove previous entries for this commercial user
      serverCarteira = serverCarteira.filter(
        (item) => String(item.Comercial || '').trim().toLowerCase() !== comercialLower
      );

      // Extract new items
      const rawItems = req.body?.items;
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        rawItems.forEach((it: any) => {
          serverCarteira.push({
            'Grupo Economico': String(it['Grupo Economico'] || it.grupoEconomico || '').trim(),
            'Nome Cliente': String(it['Nome Cliente'] || it.nomeCliente || '').trim(),
            'Comercial': comercial,
          });
        });
      } else {
        const clientes: string[] = Array.isArray(req.body?.clientes)
          ? req.body.clientes
          : typeof req.body?.clientes === 'string'
          ? req.body.clientes.split(',').map((s: string) => s.trim())
          : [];

        const grupos: string[] = Array.isArray(req.body?.grupos)
          ? req.body.grupos
          : typeof req.body?.grupos === 'string'
          ? req.body.grupos.split(',').map((s: string) => s.trim())
          : [];

        const mappings: Record<string, string> = req.body?.mappings || {};

        if (clientes.length > 0) {
          clientes.forEach((cli) => {
            if (!cli) return;
            let grp = mappings[cli] || '';
            const gLower = grp.toLowerCase().trim();
            if (gLower === 'outros' || gLower === 'sem grupo') {
              grp = '';
            }
            serverCarteira.push({
              'Grupo Economico': grp,
              'Nome Cliente': cli,
              'Comercial': comercial,
            });
          });
        } else if (grupos.length > 0) {
          grupos.forEach((grp) => {
            if (!grp) return;
            const gLower = grp.toLowerCase().trim();
            if (gLower === 'outros' || gLower === 'sem grupo') return;
            serverCarteira.push({
              'Grupo Economico': grp,
              'Nome Cliente': '',
              'Comercial': comercial,
            });
          });
        }
      }

      saveServerCarteira();
      console.log(`[METARH Carteira DB] Saved assignments for Comercial '${comercial}' (${serverCarteira.length} total assignments in DB).`);

      // Asynchronously trigger Google Apps Script Web App sync
      try {
        const params = new URLSearchParams();
        params.append('action', 'saveAssignments');
        params.append('comercial', comercial);
        params.append('clientes', JSON.stringify(req.body?.clientes || []));
        params.append('grupos', JSON.stringify(req.body?.grupos || []));
        params.append('mappings', JSON.stringify(req.body?.mappings || {}));

        fetch(`${APPS_SCRIPT_CARTEIRA_URL}?${params.toString()}`, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      } catch (e) {
        // ignore background sync errors
      }

      const comercialData = serverCarteira.filter(
        (i) => String(i.Comercial || '').trim().toLowerCase() === comercialLower
      );
      return res.json({ success: true, comercial, data: comercialData, all: serverCarteira });
    }

    // Default action: getAssignments
    if (comercialFilter) {
      const comercialLower = comercialFilter.toLowerCase();
      const filtered = serverCarteira.filter(
        (i) => String(i.Comercial || '').trim().toLowerCase() === comercialLower
      );
      return res.json({ success: true, comercial: comercialFilter, data: filtered });
    }

    return res.json({ success: true, data: serverCarteira });
  } catch (err: any) {
    console.error('Error in /api/commercial-assignments handler:', err);
    return res.status(500).json({ success: false, error: err.message, data: serverCarteira });
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

