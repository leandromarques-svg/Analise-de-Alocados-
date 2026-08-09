import { Funcionario } from '../types';
import { APPS_SCRIPT_CARTEIRA_URL } from '../services/userService';

const CLIENT_ASSIGNMENTS_KEY = 'metarh_commercial_client_assignments_v1';
const CARTEIRA_LOCAL_KEY = 'metarh_carteira_assignments_v1';

export interface ClientInactivityStatus {
  clientName: string;
  cnpj: string;
  grupoEconomico: string;
  totalWorkers: number;
  activeWorkers: number;
  inactiveWorkers: number;
  totalMonthlySalary: number;
  averageSalary: number;
  lastAdmissionDate: string | null;
  daysSinceLastAdmission: number | null;
  isInactiveOver1Year: boolean;
  assignedRep: string; // Username of commercial rep or '' if unassigned
  recentAdmissionsCount: number; // Admissions in the last N months
}

export interface PortfolioAlert {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  entityName: string;
  metricChange: string;
}

// Format date string to DD/MM/AAAA format
export function formatDateDDMMAAAA(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Sem registro';
  const clean = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  const parts = clean.split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  const d = new Date(clean);
  if (isNaN(d.getTime())) return clean;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Read client assignments mapping from localStorage, merging keys if needed
export function getClientAssignments(): Record<string, string> {
  let map: Record<string, string> = {};
  try {
    const stored = localStorage.getItem(CLIENT_ASSIGNMENTS_KEY);
    if (stored) {
      map = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading client assignments:', e);
  }

  // Also check CARTEIRA_LOCAL_KEY array if present
  try {
    const carteiraRaw = localStorage.getItem(CARTEIRA_LOCAL_KEY);
    if (carteiraRaw) {
      const parsed = JSON.parse(carteiraRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          const cli = item['Nome Cliente'] || item.nomeCliente || item.cliente;
          const rep = item['Comercial'] || item.comercial;
          if (cli && rep && !map[cli]) {
            map[cli] = rep;
          }
        });
      }
    }
  } catch (e) {
    // ignore
  }

  return map;
}

// Assign client to commercial representative and sync across local & server storage
export function saveClientAssignment(clientName: string, repUsername: string): Record<string, string> {
  const current = getClientAssignments();
  if (repUsername) {
    current[clientName] = repUsername;
  } else {
    delete current[clientName];
  }

  try {
    localStorage.setItem(CLIENT_ASSIGNMENTS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving client assignment:', e);
  }

  // Also update CARTEIRA_LOCAL_KEY array
  try {
    const items = Object.entries(current).map(([cli, rep]) => ({
      'Grupo Economico': '',
      'Nome Cliente': cli,
      'Comercial': rep,
    }));
    localStorage.setItem(CARTEIRA_LOCAL_KEY, JSON.stringify(items));
  } catch (e) {
    // ignore
  }

  // Asynchronously trigger server API POST or Google Apps Script ping
  if (repUsername) {
    const repClients = Object.entries(current)
      .filter(([_, r]) => r === repUsername)
      .map(([cli]) => cli);

    fetch('/api/commercial-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveAssignments',
        comercial: repUsername,
        clientes: repClients,
        grupos: [],
      }),
    }).catch(() => {});

    // Direct Google Script ping (essential for Vercel / static builds)
    const params = new URLSearchParams();
    params.append('action', 'saveAssignments');
    params.append('comercial', repUsername);
    params.append('clientes', repClients.join(','));
    params.append('grupos', '');
    params.append('t', String(Date.now()));

    fetch(`${APPS_SCRIPT_CARTEIRA_URL}?${params.toString()}`, { method: 'GET' }).catch(() => {});
  }

  return current;
}

// Sync assignments from server DB or Google Apps Script into local storage
export async function syncCommercialAssignmentsServer(): Promise<Record<string, string>> {
  let items: any[] = [];

  // 1. Try server API (/api/commercial-assignments)
  try {
    const res = await fetch(`/api/commercial-assignments?refresh=true&t=${Date.now()}`);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const parsed = json.all || json.data || (Array.isArray(json) ? json : null);
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Could not sync commercial assignments from server API:', e);
  }

  // 2. Direct fallback to Google Apps Script Web App (vital for Vercel static deployments)
  if (items.length === 0) {
    try {
      const scriptUrl = `${APPS_SCRIPT_CARTEIRA_URL}?action=getAssignments&t=${Date.now()}`;
      const res = await fetch(scriptUrl);
      if (res.ok) {
        const json = await res.json();
        const parsed = Array.isArray(json) ? json : (json && Array.isArray(json.data) ? json.data : []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not sync commercial assignments from Google Script directly:', e);
    }
  }

  if (items.length > 0) {
    const current = getClientAssignments();
    items.forEach((item: any) => {
      const cli = item['Nome Cliente'] || item.nomeCliente || item.cliente;
      const grp = item['Grupo Economico'] || item.grupoEconomico || item.grupo;
      const rep = item['Comercial'] || item.comercial;
      if (rep) {
        if (cli) current[String(cli).trim()] = String(rep).trim();
        if (grp) current[String(grp).trim()] = String(rep).trim();
      }
    });
    localStorage.setItem(CLIENT_ASSIGNMENTS_KEY, JSON.stringify(current));
    localStorage.setItem(CARTEIRA_LOCAL_KEY, JSON.stringify(items));
    return current;
  }

  return getClientAssignments();
}

// Calculate inactivity status for all unique Clients in the dataset
export function getClientInactivityList(
  workers: Funcionario[],
  monthsPeriod: number = 12
): ClientInactivityStatus[] {
  const assignments = getClientAssignments();
  const now = new Date();
  const cutoffPeriodDate = new Date();
  cutoffPeriodDate.setMonth(now.getMonth() - monthsPeriod);

  const oneYearAgoDate = new Date();
  oneYearAgoDate.setFullYear(now.getFullYear() - 1);

  // Group workers by client name
  const clientMap = new Map<string, Funcionario[]>();
  workers.forEach((w) => {
    const name = w.nomeCliente || 'Cliente Não Especificado';
    if (!clientMap.has(name)) {
      clientMap.set(name, []);
    }
    clientMap.get(name)!.push(w);
  });

  const list: ClientInactivityStatus[] = [];

  clientMap.forEach((clientWorkers, clientName) => {
    let activeWorkers = 0;
    let totalSalary = 0;
    let latestAdmission: Date | null = null;
    let latestAdmissionStr: string | null = null;
    let recentAdmissions = 0;

    const grupoEconomico = clientWorkers[0]?.grupoEconomico || 'Outros';
    const cnpj = clientWorkers[0]?.cnpjCliente || '';

    clientWorkers.forEach((w) => {
      if (w.isAtivo) {
        activeWorkers++;
        totalSalary += w.salario || 0;
      }

      if (w.dataAdmissao) {
        const admDate = new Date(w.dataAdmissao);
        if (!isNaN(admDate.getTime())) {
          if (!latestAdmission || admDate > latestAdmission) {
            latestAdmission = admDate;
            latestAdmissionStr = w.dataAdmissao;
          }
          if (admDate >= cutoffPeriodDate) {
            recentAdmissions++;
          }
        }
      }
    });

    let daysSinceLastAdmission: number | null = null;
    let isInactiveOver1Year = false;

    if (latestAdmission) {
      const diffMs = now.getTime() - (latestAdmission as Date).getTime();
      daysSinceLastAdmission = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      // Inactive over 1 year if latest admission is > 365 days ago or if 0 active workers
      if (daysSinceLastAdmission > 365 || activeWorkers === 0) {
        isInactiveOver1Year = true;
      }
    } else {
      isInactiveOver1Year = true;
    }

    const assignedRep = assignments[clientName] || (grupoEconomico ? assignments[grupoEconomico] : '') || '';

    list.push({
      clientName,
      cnpj,
      grupoEconomico,
      totalWorkers: clientWorkers.length,
      activeWorkers,
      inactiveWorkers: clientWorkers.length - activeWorkers,
      totalMonthlySalary: totalSalary,
      averageSalary: activeWorkers > 0 ? totalSalary / activeWorkers : 0,
      lastAdmissionDate: formatDateDDMMAAAA(latestAdmissionStr),
      daysSinceLastAdmission,
      isInactiveOver1Year,
      assignedRep,
      recentAdmissionsCount: recentAdmissions,
    });
  });

  return list.sort((a, b) => b.activeWorkers - a.activeWorkers);
}

// Calculate portfolio analytics for a specific commercial rep or list of assigned clients
export function analyzePortfolioForPeriod(
  workers: Funcionario[],
  assignedClients: string[],
  months: number
) {
  const now = new Date();
  const periodCutoff = new Date();
  periodCutoff.setMonth(now.getMonth() - months);

  const prevPeriodStart = new Date();
  prevPeriodStart.setMonth(now.getMonth() - months * 2);

  // Filter workers belonging strictly to rep's assigned clients or economic groups
  const portfolioWorkers = assignedClients.length === 0
    ? []
    : workers.filter((w) => {
        const clientMatch = assignedClients.includes(w.nomeCliente);
        const groupMatch = Boolean(w.grupoEconomico && assignedClients.includes(w.grupoEconomico));
        return clientMatch || groupMatch;
      });

  const activeWorkers = portfolioWorkers.filter((w) => w.isAtivo);
  const totalMonthlyFolha = activeWorkers.reduce((acc, w) => acc + (w.salario || 0), 0);
  const averageTicket = activeWorkers.length > 0 ? totalMonthlyFolha / activeWorkers.length : 0;

  // Unique clients in portfolio
  const uniqueClientsInPortfolio = Array.from(new Set(portfolioWorkers.map((w) => w.nomeCliente)));

  // Client inactivity breakdown
  const clientStats = getClientInactivityList(portfolioWorkers, months);
  const clientsWithoutNewActiveInPeriod = clientStats.filter((c) => c.recentAdmissionsCount === 0);

  // Compare recent admissions vs previous period for trend analysis
  let currentPeriodAdmissions = 0;
  let previousPeriodAdmissions = 0;

  portfolioWorkers.forEach((w) => {
    if (w.dataAdmissao) {
      const d = new Date(w.dataAdmissao);
      if (!isNaN(d.getTime())) {
        if (d >= periodCutoff) {
          currentPeriodAdmissions++;
        } else if (d >= prevPeriodStart && d < periodCutoff) {
          previousPeriodAdmissions++;
        }
      }
    }
  });

  // Generate alerts & positive callouts
  const alerts: PortfolioAlert[] = [];

  // Check clients with declining hiring volume or 0 new hires
  clientsWithoutNewActiveInPeriod.slice(0, 5).forEach((c) => {
    alerts.push({
      id: `warn-nohire-${c.clientName}`,
      type: 'warning',
      title: 'Atenção: Sem Novas Alocações',
      description: `O cliente "${c.clientName}" não teve novos alocados nos últimos ${months} meses. Pode requerer contato com o RH Focal.`,
      entityName: c.clientName,
      metricChange: `${c.activeWorkers} ativos atuais`,
    });
  });

  // Positive callout for high ticket or growing clients
  const growingClients = clientStats.filter((c) => c.recentAdmissionsCount > 2);
  growingClients.slice(0, 3).forEach((c) => {
    alerts.push({
      id: `succ-growth-${c.clientName}`,
      type: 'success',
      title: 'Excelente Desempenho!',
      description: `O cliente "${c.clientName}" contratou ${c.recentAdmissionsCount} novos profissionais no período analisado.`,
      entityName: c.clientName,
      metricChange: `+${c.recentAdmissionsCount} contratações`,
    });
  });

  return {
    portfolioWorkersCount: portfolioWorkers.length,
    activeWorkersCount: activeWorkers.length,
    totalMonthlyFolha,
    averageTicket,
    totalClientsCount: uniqueClientsInPortfolio.length,
    clientsWithoutNewActiveInPeriod,
    currentPeriodAdmissions,
    previousPeriodAdmissions,
    alerts,
    clientStats,
  };
}
