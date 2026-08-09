import { User, UserRole, UserLog } from '../types';

const APPS_SCRIPT_USER_URL = 'https://script.google.com/macros/s/AKfycbxvEbfCjw5prUCltIj5KWGzilUXsp-tu4fIA_ZYvr5WWJ0k4OoJL7SLOP1ZrnSCejV8/exec';
const APPS_SCRIPT_CARTEIRA_URL = 'https://script.google.com/macros/s/AKfycbyAAGFPmP4QxDbhDLFaxvfgzKbVzFil21iSDhyXqo9dSeGweyGwBYPDPu9AaCMwz8-Yfw/exec';
const LOCAL_STORAGE_KEY = 'metarh_users_v2';
const CARTEIRA_LOCAL_KEY = 'metarh_carteira_assignments_v1';
const CURRENT_USER_KEY = 'metarh_current_user_v2';
const DELETED_USERS_KEY = 'metarh_deleted_users_v2';

const INITIAL_TEST_USERNAMES = ['admin', 'colaborador', 'cliente', 'rh_recrutamento', 'comercial_carlos', 'head_comercial'];

const getDeletedUsers = (): Set<string> => {
  try {
    const stored = localStorage.getItem(DELETED_USERS_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) {
        return new Set(arr.map((s: string) => s.toLowerCase()));
      }
    }
  } catch (e) {
    console.error(e);
  }
  // Initialize with test accounts deleted by default
  const initialSet = new Set(INITIAL_TEST_USERNAMES);
  saveDeletedUsers(initialSet);
  return initialSet;
};

const saveDeletedUsers = (set: Set<string>) => {
  localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(set)));
};

// Initial default accounts - only Master Admin Leandro
const DEFAULT_USERS: User[] = [
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

// Helper to get local users synchronously without triggering remote fetches
const getLocalUsers = (): User[] => {
  const deletedUsers = getDeletedUsers();
  let list: User[] = [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (e) {
    console.error('Error reading local users:', e);
  }

  if (list.length === 0) {
    list = DEFAULT_USERS;
  }

  // Filter out any explicitly deleted users
  list = list.filter((u) => !deletedUsers.has(u.username.toLowerCase()));

  // Ensure master admin Leandro exists unless explicitly removed
  const hasLeandro = list.some((u) => u.username.toLowerCase() === 'leandro');
  if (!hasLeandro && !deletedUsers.has('leandro')) {
    list.unshift({
      id: 'admin_leandro',
      username: 'Leandro',
      password: '@Pi#101412',
      role: 'Administrador',
      createdAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  return list;
};

const parseArrayField = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
  if (typeof val === 'string') {
    return val
      .split(/[,;|]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

export const getUsers = async (): Promise<User[]> => {
  const deletedUsers = getDeletedUsers();

  try {
    let remoteData: any = null;

    // 1. Try server endpoint (/api/users)
    try {
      const apiRes = await fetch(`/api/users?action=getUsers&t=${Date.now()}`);
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json && Array.isArray(json.users)) {
          remoteData = json.users;
        } else if (json && Array.isArray(json.data)) {
          remoteData = json.data;
        } else if (Array.isArray(json)) {
          remoteData = json;
        }
      }
    } catch (e) {
      console.warn('Server endpoint /api/users failed:', e);
    }

    // 2. Fallback to direct Google Apps Script URL if server had no records
    if (!remoteData || remoteData.length === 0) {
      try {
        const res = await fetch(`${APPS_SCRIPT_USER_URL}?action=getUsers&t=${Date.now()}`, {
          method: 'GET',
        });
        if (res.ok) {
          remoteData = await res.json();
        }
      } catch (e) {
        // ignore
      }
    }

    if (Array.isArray(remoteData) && remoteData.length > 0) {
      const formattedRemote: User[] = remoteData
        .filter((u: any) => {
          if (!u) return false;
          const uname = String(u.username || u.usuario || u.user || '').trim().toLowerCase();
          // Filter out empty, header, or deleted rows
          return (
            uname !== '' &&
            uname !== 'usuário' &&
            uname !== 'usuario' &&
            uname !== 'username' &&
            !deletedUsers.has(uname)
          );
        })
        .map((u: any) => {
          const grupos = parseArrayField(
            u.gruposEconomicos || u.gruposAtribuidos || u.grupos || u.grupoEconomico || u.grupo
          );
          const clientes = parseArrayField(
            u.clientesAtribuidos || u.clientes || u.cliente || u.clientesCarteira || u.carteira
          );
          const cnpjs = parseArrayField(u.cnpjsAtribuidos || u.cnpjs);

          return {
            id: String(u.id || u.username || u.usuario || Date.now()),
            username: String(u.username || u.usuario || u.user).trim(),
            password: String(u.password || u.senha || '123').trim(),
            role: (u.role || u.nivel || u.nivelAcesso || 'Colaborador') as UserRole,
            grupoEconomico: u.grupoEconomico || u.grupo || (grupos[0] || ''),
            gruposEconomicos: grupos.length > 0 ? grupos : u.grupoEconomico ? [u.grupoEconomico] : [],
            clientesAtribuidos: clientes,
            cnpjsAtribuidos: cnpjs,
            logs: Array.isArray(u.logs) ? u.logs : [],
            createdAt: u.createdAt || new Date().toISOString(),
          };
        });

      // Map to deduplicate by username
      const userMap = new Map<string, User>();

      // 1. DEFAULT_USERS
      for (const u of DEFAULT_USERS) {
        if (!deletedUsers.has(u.username.toLowerCase())) {
          userMap.set(u.username.toLowerCase(), u);
        }
      }

      // 2. Merge server remote users with HIGHEST priority
      for (const u of formattedRemote) {
        const key = u.username.toLowerCase();
        if (!deletedUsers.has(key)) {
          userMap.set(key, u);
        }
      }

      const mergedList = Array.from(userMap.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedList));
      return mergedList;
    }
  } catch (e) {
    console.warn('User DB unavailable, using local cache:', e);
  }

  return getLocalUsers();
};

export const addUserLog = async (
  username: string,
  author: string,
  action: string,
  details: string
): Promise<User[]> => {
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.username.toLowerCase() === username.toLowerCase());
  if (idx >= 0) {
    const targetUser = users[idx];
    const newLog: UserLog = {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      author,
      action,
      details,
    };
    const updatedUser: User = {
      ...targetUser,
      logs: [newLog, ...(targetUser.logs || [])],
      updatedAt: new Date().toISOString(),
    };
    return saveUser(updatedUser);
  }
  return users;
};

export const saveUser = async (user: User): Promise<User[]> => {
  // Remove from deleted list if saving/restoring
  const deletedUsers = getDeletedUsers();
  if (deletedUsers.has(user.username.toLowerCase())) {
    deletedUsers.delete(user.username.toLowerCase());
    saveDeletedUsers(deletedUsers);
  }

  const users = getLocalUsers();
  const existingIdx = users.findIndex((u) => u.username.toLowerCase() === user.username.toLowerCase());

  let updatedList: User[];
  if (existingIdx >= 0) {
    updatedList = [...users];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...user };
  } else {
    const newUser: User = {
      ...user,
      id: user.id || String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    updatedList = [...users, newUser];
  }

  // Update local storage instantly
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

  // Sync to server API (/api/users) with JSON POST
  try {
    const apiRes = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveUser', user }),
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.users && Array.isArray(json.users)) {
        updatedList = json.users;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      }
    }
  } catch (e) {
    console.warn('Could not post user to /api/users:', e);
  }

  return updatedList;
};

export const deleteUser = async (username: string): Promise<User[]> => {
  // Register in deletedUsers set so getUsers() never resurrects this user
  const deletedUsers = getDeletedUsers();
  deletedUsers.add(username.toLowerCase());
  saveDeletedUsers(deletedUsers);

  const users = getLocalUsers();
  let updatedList = users.filter((u) => u.username.toLowerCase() !== username.toLowerCase());

  // Update local storage instantly
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

  // Sync delete to server endpoint
  try {
    const apiRes = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', username }),
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.users && Array.isArray(json.users)) {
        updatedList = json.users;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      }
    }
  } catch (e) {
    console.warn('Could not delete user on server DB:', e);
  }

  return updatedList;
};

export const getCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

export const getCurrentUserFromStorage = getCurrentUser;

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export interface CommercialAssignment {
  'Grupo Economico': string;
  'Nome Cliente': string;
  'Comercial': string;
}

export const getCommercialAssignments = async (comercialUsername?: string): Promise<CommercialAssignment[]> => {
  let results: CommercialAssignment[] = [];

  // 1. Try server API (/api/commercial-assignments)
  try {
    const url = comercialUsername
      ? `/api/commercial-assignments?comercial=${encodeURIComponent(comercialUsername)}&t=${Date.now()}`
      : `/api/commercial-assignments?t=${Date.now()}`;

    const apiRes = await fetch(url);
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        results = json.data;
      }
    }
  } catch (e) {
    console.warn('Could not fetch commercial assignments from /api/commercial-assignments:', e);
  }

  // 2. Direct fetch fallback from Google Apps Script Web App
  if (results.length === 0) {
    try {
      const scriptUrl = comercialUsername
        ? `${APPS_SCRIPT_CARTEIRA_URL}?action=getAssignments&comercial=${encodeURIComponent(comercialUsername)}&t=${Date.now()}`
        : `${APPS_SCRIPT_CARTEIRA_URL}?action=getAssignments&t=${Date.now()}`;

      const res = await fetch(scriptUrl, {
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json && Array.isArray(json.data) ? json.data : []);
        if (Array.isArray(items) && items.length > 0) {
          results = items;
        }
      }
    } catch (e) {
      console.warn('Direct fetch from Apps Script Carteira URL failed:', e);
    }
  }

  // 3. Fallback to local storage
  if (results.length === 0) {
    try {
      const stored = localStorage.getItem(CARTEIRA_LOCAL_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (comercialUsername) {
            const lower = comercialUsername.toLowerCase();
            results = parsed.filter((item) => String(item.Comercial || '').toLowerCase() === lower);
          } else {
            results = parsed;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (results.length > 0) {
    results = results.map((item: any) => ({
      'Grupo Economico': String(item['Grupo Economico'] || item.grupoEconomico || item.grupo || '').trim(),
      'Nome Cliente': String(item['Nome Cliente'] || item.nomeCliente || item.cliente || '').trim(),
      'Comercial': String(item['Comercial'] || item.comercial || '').trim(),
    })).filter((item) => item.Comercial || item['Nome Cliente'] || item['Grupo Economico']);

    localStorage.setItem(CARTEIRA_LOCAL_KEY, JSON.stringify(results));
  }

  return results;
};

export const saveCommercialAssignments = async (
  comercialUsername: string,
  clientes: string[],
  grupos: string[],
  mappings: Record<string, string> = {}
): Promise<boolean> => {
  const payload = {
    action: 'saveAssignments',
    comercial: comercialUsername,
    clientes,
    grupos,
    mappings,
  };

  // 1. Sync to server API
  try {
    const apiRes = await fetch('/api/commercial-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && Array.isArray(json.data)) {
        localStorage.setItem(CARTEIRA_LOCAL_KEY, JSON.stringify(json.data));
      }
    }
  } catch (e) {
    console.warn('Could not post to /api/commercial-assignments:', e);
  }

  // 2. Direct ping to Google Apps Script Web App
  try {
    const params = new URLSearchParams();
    params.append('action', 'saveAssignments');
    params.append('comercial', comercialUsername);
    params.append('clientes', clientes.join(','));
    params.append('grupos', grupos.join(','));
    params.append('t', String(Date.now()));

    const targetUrl = `${APPS_SCRIPT_CARTEIRA_URL}?${params.toString()}`;
    const img = new Image();
    img.src = targetUrl;

    fetch(targetUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {});
  } catch (e) {
    console.warn('Could not ping Apps Script Carteira URL:', e);
  }

  return true;
};
