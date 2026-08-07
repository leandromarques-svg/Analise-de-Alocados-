import { User, UserRole, UserLog } from '../types';

const APPS_SCRIPT_USER_URL = 'https://script.google.com/macros/s/AKfycbxvEbfCjw5prUCltIj5KWGzilUXsp-tu4fIA_ZYvr5WWJ0k4OoJL7SLOP1ZrnSCejV8/exec';
const LOCAL_STORAGE_KEY = 'metarh_users_v2';
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
  const localUsers = getLocalUsers();

  try {
    let remoteData: any = null;

    // 1. Try local or Vercel serverless API endpoint first (/api/users)
    try {
      const apiRes = await fetch(`/api/users?action=getUsers&t=${Date.now()}`);
      if (apiRes.ok) {
        const contentType = apiRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await apiRes.json();
          if (Array.isArray(json)) {
            remoteData = json;
          } else if (json && Array.isArray(json.data)) {
            remoteData = json.data;
          }
        }
      }
    } catch (e) {
      // ignore endpoint failure, fallback to direct fetch
    }

    // 2. Fallback to direct Google Apps Script URL
    if (!remoteData) {
      const res = await fetch(`${APPS_SCRIPT_USER_URL}?action=getUsers&t=${Date.now()}`, {
        method: 'GET',
      });
      if (res.ok) {
        remoteData = await res.json();
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

      // 2. Merge remote users (without overriding local changes)
      for (const u of formattedRemote) {
        const key = u.username.toLowerCase();
        if (!deletedUsers.has(key)) {
          const existing = userMap.get(key);
          userMap.set(key, { ...u, ...existing });
        }
      }

      // 3. Merge localUsers with HIGHEST PRIORITY (preserves edited roles, grupos, clientes, logs)
      for (const u of localUsers) {
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
    console.warn('Apps Script User DB unavailable, using local cache:', e);
  }

  return localUsers;
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

  // Sync to remote Apps Script DB asynchronously with multiple delivery fallbacks
  try {
    const params = new URLSearchParams();
    params.append('action', 'saveUser');
    params.append('username', user.username);
    params.append('usuario', user.username);
    params.append('user', user.username);
    params.append('password', user.password || '123');
    params.append('senha', user.password || '123');
    params.append('role', user.role);
    params.append('nivel', user.role);
    params.append('nivelAcesso', user.role);
    const clientesList = user.clientesAtribuidos || [];
    const gruposList = user.gruposEconomicos || (user.grupoEconomico ? [user.grupoEconomico] : []);
    const clientesStr = clientesList.join(', ');
    const gruposStr = gruposList.join(', ');

    params.append('grupoEconomico', user.grupoEconomico || (gruposList[0] || ''));
    params.append('grupo', user.grupoEconomico || (gruposList[0] || ''));
    params.append('gruposEconomicos', gruposStr);
    params.append('gruposAtribuidos', gruposStr);
    params.append('grupos', gruposStr);
    params.append('clientesAtribuidos', clientesStr);
    params.append('clientes', clientesStr);
    params.append('cliente', clientesStr);
    params.append('carteira', clientesStr);
    params.append('clientesCarteira', clientesStr);
    params.append('t', String(Date.now()));

    const queryString = params.toString();
    const fullUrl = `${APPS_SCRIPT_USER_URL}?${queryString}`;

    const img = new Image();
    img.src = fullUrl;

    Promise.allSettled([
      fetch(`/api/users?${queryString}`).catch(() => {}),
      fetch(fullUrl, { method: 'GET', mode: 'no-cors' }),
      fetch(APPS_SCRIPT_USER_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: queryString,
      }),
    ]).catch(() => {});
  } catch (e) {
    console.warn('Could not post to Apps Script user DB:', e);
  }

  return updatedList;
};

export const deleteUser = async (username: string): Promise<User[]> => {
  // Register in deletedUsers set so getUsers() never resurrects this user
  const deletedUsers = getDeletedUsers();
  deletedUsers.add(username.toLowerCase());
  saveDeletedUsers(deletedUsers);

  const users = getLocalUsers();
  const updatedList = users.filter((u) => u.username.toLowerCase() !== username.toLowerCase());

  // Update local storage instantly
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

  // Sync delete to Apps Script DB asynchronously with multiple delivery fallbacks
  try {
    const params = new URLSearchParams();
    params.append('action', 'deleteUser');
    params.append('username', username);
    params.append('usuario', username);
    params.append('user', username);
    params.append('t', String(Date.now()));

    const queryString = params.toString();
    const fullUrl = `${APPS_SCRIPT_USER_URL}?${queryString}`;

    const img = new Image();
    img.src = fullUrl;

    Promise.allSettled([
      fetch(`/api/users?${queryString}`).catch(() => {}),
      fetch(fullUrl, { method: 'GET', mode: 'no-cors' }),
      fetch(APPS_SCRIPT_USER_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: queryString,
      }),
    ]).catch(() => {});
  } catch (e) {
    console.warn('Could not delete user on Apps Script user DB:', e);
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
