import { User, UserRole, UserLog } from '../types';

const LOCAL_STORAGE_KEY = 'metarh_users_v2';
export const CARTEIRA_LOCAL_KEY = 'metarh_carteira_assignments_v1';
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

const getLocalUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading local users:', e);
  }
  return [];
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
  try {
    let remoteData: any = null;

    try {
      const apiRes = await fetch(`/api/users?action=getUsers&t=${Date.now()}`);
      if (apiRes.ok) {
        const contentType = apiRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await apiRes.json();
          if (json && Array.isArray(json.users)) {
            remoteData = json.users;
          } else if (json && Array.isArray(json.data)) {
            remoteData = json.data;
          } else if (Array.isArray(json)) {
            remoteData = json;
          }
        }
      }
    } catch (e) {
      console.warn('Server endpoint /api/users failed:', e);
    }

    if (Array.isArray(remoteData)) {
      const formattedRemote: User[] = remoteData
        .filter((u: any) => {
          if (!u) return false;
          const uname = String(u.username || u.usuario || u.user || '').trim().toLowerCase();
          // Filter out empty, header, or deleted rows
          return (
            uname !== '' &&
            uname !== 'usuário' &&
            uname !== 'usuario' &&
            uname !== 'username'
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

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formattedRemote));
      return formattedRemote;
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
      ? `/api/commercial-assignments?comercial=${encodeURIComponent(comercialUsername)}&refresh=true&t=${Date.now()}`
      : `/api/commercial-assignments?refresh=true&t=${Date.now()}`;

    const apiRes = await fetch(url);
    if (apiRes.ok) {
      const contentType = apiRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await apiRes.json();
        const items = json.all || json.data;
        if (json && Array.isArray(items) && items.length > 0) {
          results = items;
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch commercial assignments from /api/commercial-assignments:', e);
  }

  // 2. Fallback to local storage
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

  let savedItems: CommercialAssignment[] | null = null;

  // 1. Sync to server API
  try {
    const apiRes = await fetch('/api/commercial-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (apiRes.ok) {
      const contentType = apiRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await apiRes.json();
        const items = json.all || json.data;
        if (json && Array.isArray(items)) {
          savedItems = items;
        }
      }
    }
  } catch (e) {
    console.warn('Could not post to /api/commercial-assignments:', e);
  }

  // 2. Update local storage & client mapping
  if (savedItems && savedItems.length > 0) {
    localStorage.setItem(CARTEIRA_LOCAL_KEY, JSON.stringify(savedItems));

    const currentAssignments: Record<string, string> = {};
    savedItems.forEach((item: any) => {
      const cli = item['Nome Cliente'] || item.nomeCliente || item.cliente;
      const grp = item['Grupo Economico'] || item.grupoEconomico || item.grupo;
      const rep = item['Comercial'] || item.comercial;
      if (rep) {
        if (cli) currentAssignments[String(cli).trim()] = String(rep).trim();
        if (grp) currentAssignments[String(grp).trim()] = String(rep).trim();
      }
    });
    localStorage.setItem('metarh_commercial_client_assignments_v1', JSON.stringify(currentAssignments));
  } else {
    // Immediate optimistic local storage update if server/script response didn't return full list
    try {
      const storedMapRaw = localStorage.getItem('metarh_commercial_client_assignments_v1');
      const currentAssignments: Record<string, string> = storedMapRaw ? JSON.parse(storedMapRaw) : {};
      clientes.forEach((cli) => {
        if (cli) currentAssignments[String(cli).trim()] = comercialUsername;
      });
      grupos.forEach((grp) => {
        if (grp) currentAssignments[String(grp).trim()] = comercialUsername;
      });
      localStorage.setItem('metarh_commercial_client_assignments_v1', JSON.stringify(currentAssignments));
    } catch (e) {
      // ignore
    }
  }

  return true;
};
