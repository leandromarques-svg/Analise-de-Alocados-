import { User, UserRole } from '../types';

const APPS_SCRIPT_USER_URL = 'https://script.google.com/macros/s/AKfycbxvEbfCjw5prUCltIj5KWGzilUXsp-tu4fIA_ZYvr5WWJ0k4OoJL7SLOP1ZrnSCejV8/exec';
const LOCAL_STORAGE_KEY = 'metarh_users_v2';
const CURRENT_USER_KEY = 'metarh_current_user_v2';

// Initial default accounts
const DEFAULT_USERS: User[] = [
  {
    id: 'admin_leandro',
    username: 'Leandro',
    password: '@Pi#101412',
    role: 'Administrador',
    createdAt: new Date().toISOString(),
  },
  {
    id: '1',
    username: 'admin',
    password: '123',
    role: 'Administrador',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    username: 'colaborador',
    password: '123',
    role: 'Colaborador',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    username: 'cliente',
    password: '123',
    role: 'Cliente',
    grupoEconomico: 'VALE S/A',
    createdAt: new Date().toISOString(),
  }
];

// Helper to get local users synchronously without triggering remote fetches
const getLocalUsers = (): User[] => {
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

  // Ensure master admin Leandro exists
  const hasLeandro = list.some((u) => u.username.toLowerCase() === 'leandro');
  if (!hasLeandro) {
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

export const getUsers = async (): Promise<User[]> => {
  const localUsers = getLocalUsers();

  // Attempt to sync from Google Apps Script DB asynchronously
  try {
    const res = await fetch(`${APPS_SCRIPT_USER_URL}?action=getUsers&t=${Date.now()}`, {
      method: 'GET',
    });
    if (res.ok) {
      const remoteData = await res.json();
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        const formattedRemote: User[] = remoteData
          .filter((u: any) => u && (u.username || u.usuario || u.user))
          .map((u: any) => ({
            id: String(u.id || u.username || u.usuario || Date.now()),
            username: String(u.username || u.usuario || u.user).trim(),
            password: String(u.password || u.senha || '123').trim(),
            role: (u.role || u.nivel || u.nivelAcesso || 'Colaborador') as UserRole,
            grupoEconomico: u.grupoEconomico || u.grupo || '',
            createdAt: u.createdAt || new Date().toISOString(),
          }));

        if (formattedRemote.length > 0) {
          if (!formattedRemote.some((u) => u.username.toLowerCase() === 'leandro')) {
            formattedRemote.unshift({
              id: 'admin_leandro',
              username: 'Leandro',
              password: '@Pi#101412',
              role: 'Administrador',
              createdAt: new Date().toISOString(),
            });
          }
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formattedRemote));
          return formattedRemote;
        }
      }
    }
  } catch (e) {
    console.warn('Apps Script User DB unavailable, using local cache:', e);
  }

  return localUsers;
};

export const saveUser = async (user: User): Promise<User[]> => {
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
    params.append('grupoEconomico', user.grupoEconomico || '');
    params.append('grupo', user.grupoEconomico || '');
    params.append('t', String(Date.now()));

    const queryString = params.toString();
    const fullUrl = `${APPS_SCRIPT_USER_URL}?${queryString}`;

    // 1. Image Ping Fallback (Guarantees GET execution regardless of CORS/redirect restrictions)
    const img = new Image();
    img.src = fullUrl;

    // 2. Fetch GET & POST
    Promise.allSettled([
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

    // 1. Image Ping Fallback
    const img = new Image();
    img.src = fullUrl;

    // 2. Fetch GET & POST
    Promise.allSettled([
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
