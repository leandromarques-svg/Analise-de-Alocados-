import { Funcionario } from '../types';

const CLIENT_ASSIGNMENTS_KEY = 'metarh_commercial_client_assignments_v1';

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

// Read client assignments mapping from localStorage
export function getClientAssignments(): Record<string, string> {
  try {
    const stored = localStorage.getItem(CLIENT_ASSIGNMENTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading client assignments:', e);
  }
  return {};
}

// Assign client to commercial representative
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
  return current;
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

    list.push({
      clientName,
      cnpj,
      grupoEconomico,
      totalWorkers: clientWorkers.length,
      activeWorkers,
      inactiveWorkers: clientWorkers.length - activeWorkers,
      totalMonthlySalary: totalSalary,
      averageSalary: activeWorkers > 0 ? totalSalary / activeWorkers : 0,
      lastAdmissionDate: latestAdmissionStr,
      daysSinceLastAdmission,
      isInactiveOver1Year,
      assignedRep: assignments[clientName] || '',
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
