import React, { useState, useMemo, useEffect } from 'react';
import { Funcionario, User } from '../../types';
import {
  Building2, Search, UserCheck, Phone, Mail, Users, Briefcase, MapPin,
  Download, ArrowUpDown, CheckCircle2, AlertCircle, Eye, X, Copy, Check,
  ExternalLink, Layers, UserSquare2, Filter, ChevronRight, Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate, parseDateDetails } from '../../utils/dataParser';
import { getClientAssignments } from '../../utils/commercialUtils';
import { getUsers } from '../../services/userService';
import { MultiSearchableSelect } from '../MultiSearchableSelect';

interface CompanyCommercialsTabProps {
  data: Funcionario[];
  clientAssignmentsMap?: Record<string, string>;
  onSelectWorker?: (worker: Funcionario) => void;
}

interface CompanySummary {
  clientName: string;
  empresa: string;
  cnpj: string;
  grupoEconomico: string;
  assignedRep: string;
  repDetails?: {
    username: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  totalWorkers: number;
  activeWorkers: number;
  inactiveWorkers: number;
  salarioTotalAtivos: number;
  cargosList: string[];
  cidadesList: string[];
  regioesList: string[];
  ufsList: string[];
  lastAdmission: string | null;
  workers: Funcionario[];
}

export const CompanyCommercialsTab: React.FC<CompanyCommercialsTabProps> = ({
  data,
  clientAssignmentsMap,
  onSelectWorker,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  const [selectedComerciais, setSelectedComerciais] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [selectedRegioes, setSelectedRegioes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned' | 'active_only'>('all');
  
  const [viewMode, setViewMode] = useState<'companies_grid' | 'companies_table' | 'by_commercial'>('companies_grid');
  const [sortBy, setSortBy] = useState<'name' | 'actives' | 'total' | 'rep' | 'grupo'>('actives');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [selectedCompanyModal, setSelectedCompanyModal] = useState<CompanySummary | null>(null);
  const [modalWorkerSearch, setModalWorkerSearch] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const [commercialUsers, setCommercialUsers] = useState<User[]>([]);

  // Load registered users to find commercial contact info
  useEffect(() => {
    let isMounted = true;
    getUsers().then((users) => {
      if (isMounted) {
        setCommercialUsers(users.filter((u) => u.role === 'Comercial' || u.role === 'Gerencial Comercial' || u.role === 'Administrador'));
      }
    }).catch((e) => console.warn('Could not load users for commercial contacts:', e));
    return () => { isMounted = false; };
  }, []);

  // Commercial assignments mapping for quick lookup
  const effectiveAssignments = useMemo(() => {
    if (clientAssignmentsMap && Object.keys(clientAssignmentsMap).length > 0) {
      return clientAssignmentsMap;
    }
    return getClientAssignments();
  }, [clientAssignmentsMap]);

  // Commercial users map by lowercase username
  const commercialUsersMap = useMemo(() => {
    const map = new Map<string, User>();
    commercialUsers.forEach((u) => {
      map.set(u.username.toLowerCase().trim(), u);
    });
    return map;
  }, [commercialUsers]);

  // Helper to obtain assigned commercial executive for any company/client
  const getClientRep = (clientName: string, grupoEconomico?: string): string => {
    return (
      effectiveAssignments[clientName] ||
      (grupoEconomico ? effectiveAssignments[grupoEconomico] : '') ||
      ''
    ).trim();
  };

  // Group data by clientName / company
  const companySummaries = useMemo<CompanySummary[]>(() => {
    const map = new Map<string, {
      clientName: string;
      empresa: string;
      cnpj: string;
      grupoEconomico: string;
      workers: Funcionario[];
      cargosSet: Set<string>;
      cidadesSet: Set<string>;
      regioesSet: Set<string>;
      ufsSet: Set<string>;
    }>();

    data.forEach((w) => {
      const cName = (w.nomeCliente || w.empresa || 'Cliente Não Informado').trim();
      if (!map.has(cName)) {
        map.set(cName, {
          clientName: cName,
          empresa: w.empresa || cName,
          cnpj: w.cnpjCliente || '',
          grupoEconomico: w.grupoEconomico || '',
          workers: [],
          cargosSet: new Set(),
          cidadesSet: new Set(),
          regioesSet: new Set(),
          ufsSet: new Set(),
        });
      }

      const entry = map.get(cName)!;
      entry.workers.push(w);
      if (!entry.cnpj && w.cnpjCliente) entry.cnpj = w.cnpjCliente;
      if (!entry.grupoEconomico && w.grupoEconomico) entry.grupoEconomico = w.grupoEconomico;
      if (!entry.empresa && w.empresa) entry.empresa = w.empresa;
      if (w.cargo) entry.cargosSet.add(w.cargo);
      if (w.cidade) entry.cidadesSet.add(w.cidade);
      if (w.regiao) entry.regioesSet.add(w.regiao);
      if (w.uf) entry.ufsSet.add(w.uf);
    });

    // Also inject any clients assigned in effectiveAssignments that might not have current workers
    Object.entries(effectiveAssignments).forEach(([cliName, repName]) => {
      if (cliName && !map.has(cliName) && repName) {
        map.set(cliName, {
          clientName: cliName,
          empresa: cliName,
          cnpj: '',
          grupoEconomico: '',
          workers: [],
          cargosSet: new Set(),
          cidadesSet: new Set(),
          regioesSet: new Set(),
          ufsSet: new Set(),
        });
      }
    });

    const result: CompanySummary[] = [];

    map.forEach((entry) => {
      const assignedRep = getClientRep(entry.clientName, entry.grupoEconomico);
      const repUser = assignedRep ? commercialUsersMap.get(assignedRep.toLowerCase()) : undefined;

      let activeCount = 0;
      let inactiveCount = 0;
      let salarioTotalAtivos = 0;
      let lastAdm: string | null = null;
      let lastAdmTimestamp = 0;

      entry.workers.forEach((w) => {
        if (w.isAtivo) {
          activeCount++;
          salarioTotalAtivos += w.salario || 0;
        } else {
          inactiveCount++;
        }

        if (w.dataAdmissao) {
          const details = parseDateDetails(w.dataAdmissao);
          const ts = details.date ? details.date.getTime() : 0;
          if (ts > lastAdmTimestamp) {
            lastAdmTimestamp = ts;
            lastAdm = formatDate(w.dataAdmissao);
          }
        }
      });

      result.push({
        clientName: entry.clientName,
        empresa: entry.empresa,
        cnpj: entry.cnpj,
        grupoEconomico: entry.grupoEconomico,
        assignedRep,
        repDetails: repUser ? {
          username: repUser.username,
          email: repUser.email,
          phone: repUser.phone,
          role: repUser.role,
        } : (assignedRep ? { username: assignedRep } : undefined),
        totalWorkers: entry.workers.length,
        activeWorkers: activeCount,
        inactiveWorkers: inactiveCount,
        salarioTotalAtivos,
        cargosList: Array.from(entry.cargosSet),
        cidadesList: Array.from(entry.cidadesSet),
        regioesList: Array.from(entry.regioesSet),
        ufsList: Array.from(entry.ufsSet),
        lastAdmission: lastAdm,
        workers: entry.workers,
      });
    });

    return result;
  }, [data, effectiveAssignments, commercialUsersMap]);

  // Derived filter options
  const grupoOptions = useMemo(() => {
    const set = new Set<string>();
    companySummaries.forEach((c) => {
      if (c.grupoEconomico) set.add(c.grupoEconomico);
    });
    return Array.from(set).sort();
  }, [companySummaries]);

  const comercialOptions = useMemo(() => {
    const set = new Set<string>();
    let hasUnassigned = false;
    companySummaries.forEach((c) => {
      if (c.assignedRep) {
        set.add(c.assignedRep);
      } else {
        hasUnassigned = true;
      }
    });
    const list = Array.from(set).sort();
    if (hasUnassigned) list.push('Sem comercial atribuído');
    return list;
  }, [companySummaries]);

  const ufOptions = useMemo(() => {
    const set = new Set<string>();
    companySummaries.forEach((c) => {
      c.ufsList.forEach((uf) => set.add(uf));
    });
    return Array.from(set).sort();
  }, [companySummaries]);

  const regiaoOptions = useMemo(() => {
    const set = new Set<string>();
    companySummaries.forEach((c) => {
      c.regioesList.forEach((r) => set.add(r));
    });
    return Array.from(set).sort();
  }, [companySummaries]);

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return companySummaries.filter((c) => {
      // Search term matching
      const matchSearch =
        q === '' ||
        c.clientName.toLowerCase().includes(q) ||
        c.empresa.toLowerCase().includes(q) ||
        c.cnpj.toLowerCase().includes(q) ||
        c.grupoEconomico.toLowerCase().includes(q) ||
        c.assignedRep.toLowerCase().includes(q) ||
        c.cidadesList.some((cid) => cid.toLowerCase().includes(q)) ||
        c.ufsList.some((uf) => uf.toLowerCase().includes(q)) ||
        c.regioesList.some((r) => r.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Grupo filter
      if (selectedGrupos.length > 0 && !selectedGrupos.includes(c.grupoEconomico)) {
        return false;
      }

      // Comercial filter
      if (selectedComerciais.length > 0) {
        const matchesComercial = selectedComerciais.some((sel) => {
          if (sel === 'Sem comercial atribuído') return !c.assignedRep;
          return c.assignedRep.toLowerCase() === sel.toLowerCase();
        });
        if (!matchesComercial) return false;
      }

      // UF filter
      if (selectedUFs.length > 0) {
        const hasUF = c.ufsList.some((uf) => selectedUFs.includes(uf));
        if (!hasUF) return false;
      }

      // Regiao filter
      if (selectedRegioes.length > 0) {
        const hasReg = c.regioesList.some((r) => selectedRegioes.includes(r));
        if (!hasReg) return false;
      }

      // Status filter
      if (statusFilter === 'assigned' && !c.assignedRep) return false;
      if (statusFilter === 'unassigned' && Boolean(c.assignedRep)) return false;
      if (statusFilter === 'active_only' && c.activeWorkers === 0) return false;

      return true;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === 'name') {
        valA = a.clientName.toLowerCase();
        valB = b.clientName.toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      } else if (sortBy === 'actives') {
        valA = a.activeWorkers;
        valB = b.activeWorkers;
      } else if (sortBy === 'total') {
        valA = a.totalWorkers;
        valB = b.totalWorkers;
      } else if (sortBy === 'rep') {
        valA = a.assignedRep.toLowerCase() || 'zzz';
        valB = b.assignedRep.toLowerCase() || 'zzz';
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      } else if (sortBy === 'grupo') {
        valA = a.grupoEconomico.toLowerCase() || 'zzz';
        valB = b.grupoEconomico.toLowerCase() || 'zzz';
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [
    companySummaries,
    searchTerm,
    selectedGrupos,
    selectedComerciais,
    selectedUFs,
    selectedRegioes,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  // Aggregate by Commercial Rep (for 'by_commercial' view)
  const repAggregates = useMemo(() => {
    const map = new Map<string, {
      repName: string;
      repDetails?: { username: string; email?: string; phone?: string; role?: string };
      companies: CompanySummary[];
      totalWorkers: number;
      activeWorkers: number;
      totalSalary: number;
      gruposSet: Set<string>;
    }>();

    filteredCompanies.forEach((comp) => {
      const repKey = comp.assignedRep || 'Sem Comercial Atribuído';
      if (!map.has(repKey)) {
        const u = commercialUsersMap.get(comp.assignedRep.toLowerCase());
        map.set(repKey, {
          repName: repKey,
          repDetails: u ? { username: u.username, email: u.email, phone: u.phone, role: u.role } : undefined,
          companies: [],
          totalWorkers: 0,
          activeWorkers: 0,
          totalSalary: 0,
          gruposSet: new Set(),
        });
      }

      const item = map.get(repKey)!;
      item.companies.push(comp);
      item.totalWorkers += comp.totalWorkers;
      item.activeWorkers += comp.activeWorkers;
      item.totalSalary += comp.salarioTotalAtivos;
      if (comp.grupoEconomico) item.gruposSet.add(comp.grupoEconomico);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.repName === 'Sem Comercial Atribuído') return 1;
      if (b.repName === 'Sem Comercial Atribuído') return -1;
      return b.activeWorkers - a.activeWorkers;
    });
  }, [filteredCompanies, commercialUsersMap]);

  // Overall KPI counts
  const kpis = useMemo(() => {
    const totalCompanies = companySummaries.length;
    const assignedCompanies = companySummaries.filter((c) => Boolean(c.assignedRep)).length;
    const unassignedCompanies = totalCompanies - assignedCompanies;
    const distinctReps = new Set(companySummaries.map((c) => c.assignedRep).filter(Boolean)).size;
    const totalActiveWorkers = companySummaries.reduce((sum, c) => sum + c.activeWorkers, 0);

    return {
      totalCompanies,
      assignedCompanies,
      unassignedCompanies,
      distinctReps,
      totalActiveWorkers,
    };
  }, [companySummaries]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedGrupos([]);
    setSelectedComerciais([]);
    setSelectedUFs([]);
    setSelectedRegioes([]);
    setStatusFilter('all');
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedGrupos.length > 0 ||
    selectedComerciais.length > 0 ||
    selectedUFs.length > 0 ||
    selectedRegioes.length > 0 ||
    statusFilter !== 'all';

  // Export CSV
  const handleExportCSV = () => {
    if (filteredCompanies.length === 0) return;

    const headers = [
      'Cliente / Empresa',
      'Razão Social (Empresa)',
      'CNPJ',
      'Grupo Econômico',
      'Comercial Responsável',
      'E-mail Comercial',
      'Telefone Comercial',
      'Colaboradores Ativos',
      'Colaboradores Desligados',
      'Total Geral Alocados',
      'Folha Salarial Ativos (R$)',
      'Cidades Atendidas',
      'Estados (UF)',
      'Última Admissão',
    ];

    const rows = filteredCompanies.map((c) => [
      `"${c.clientName.replace(/"/g, '""')}"`,
      `"${c.empresa.replace(/"/g, '""')}"`,
      `"${c.cnpj.replace(/"/g, '""')}"`,
      `"${c.grupoEconomico.replace(/"/g, '""')}"`,
      `"${(c.assignedRep || 'Sem comercial atribuído').replace(/"/g, '""')}"`,
      `"${(c.repDetails?.email || '').replace(/"/g, '""')}"`,
      `"${(c.repDetails?.phone || '').replace(/"/g, '""')}"`,
      c.activeWorkers,
      c.inactiveWorkers,
      c.totalWorkers,
      c.salarioTotalAtivos.toFixed(2),
      `"${c.cidadesList.join(', ').replace(/"/g, '""')}"`,
      `"${c.ufsList.join(', ').replace(/"/g, '""')}"`,
      `"${c.lastAdmission || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `METARH_Comerciais_por_Empresa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-['Barlow',sans-serif]">
      
      {/* Top Banner / Explanation */}
      <div className="bg-gradient-to-r from-[#2c0d4a] via-[#401669] to-[#1f0733] text-white p-6 rounded-3xl shadow-lg border border-purple-900/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-purple-200 border border-white/20 flex-shrink-0 shadow-inner">
              <Building2 className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                  Módulo RH &amp; Operações
                </span>
                <span className="text-purple-300 text-xs font-semibold">
                  Consulta de Atendimento Comercial
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                Comerciais Responsáveis por Empresa
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/90 max-w-3xl mt-1 leading-relaxed">
                Consulte em tempo real qual executivo comercial atende cada empresa, cliente ou grupo econômico, visualize canais de contato direto e acesse os colaboradores alocados em cada contrato.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              title="Exportar listagem completa em planilha CSV"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Exportar Planilha</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-purple-800/60">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Empresas / Clientes</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{kpis.totalCompanies}</div>
            <span className="text-[11px] text-purple-300/70">{kpis.totalActiveWorkers} alocados ativos</span>
          </div>

          <div className="bg-emerald-950/40 backdrop-blur-xs rounded-2xl p-3.5 border border-emerald-500/30">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Com Comercial Atribuído</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">{kpis.assignedCompanies}</div>
            <span className="text-[11px] text-emerald-400/80">
              {Math.round((kpis.assignedCompanies / (kpis.totalCompanies || 1)) * 100)}% da base coberta
            </span>
          </div>

          <div className="bg-amber-950/40 backdrop-blur-xs rounded-2xl p-3.5 border border-amber-500/30">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Sem Comercial</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{kpis.unassignedCompanies}</div>
            <span className="text-[11px] text-amber-300/70">Aguardando definição</span>
          </div>

          <div className="bg-purple-950/40 backdrop-blur-xs rounded-2xl p-3.5 border border-purple-500/30">
            <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Executivos Comerciais</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{kpis.distinctReps}</div>
            <span className="text-[11px] text-purple-300/80">Em atendimento ativo</span>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Row 1: Search & View Modes */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Main search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por empresa, cliente, CNPJ, grupo econômico, comercial responsável, cidade ou UF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#401669] focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 self-start md:self-auto flex-shrink-0">
            <button
              onClick={() => setViewMode('companies_grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'companies_grid'
                  ? 'bg-[#401669] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setViewMode('companies_table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'companies_table'
                  ? 'bg-[#401669] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>

            <button
              onClick={() => setViewMode('by_commercial')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'by_commercial'
                  ? 'bg-[#401669] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserSquare2 className="w-3.5 h-3.5" />
              <span>Por Comercial</span>
            </button>
          </div>
        </div>

        {/* Row 2: Searchable Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <MultiSearchableSelect
            label="Grupo Econômico"
            selectedValues={selectedGrupos}
            onChange={setSelectedGrupos}
            options={grupoOptions}
            allLabel="Todos os Grupos"
            placeholder="Buscar grupo..."
          />

          <MultiSearchableSelect
            label="Comercial Responsável"
            selectedValues={selectedComerciais}
            onChange={setSelectedComerciais}
            options={comercialOptions}
            allLabel="Todos os Comerciais"
            placeholder="Buscar executivo comercial..."
          />

          <MultiSearchableSelect
            label="Estado (UF)"
            selectedValues={selectedUFs}
            onChange={setSelectedUFs}
            options={ufOptions}
            allLabel="Todos os Estados"
            placeholder="Buscar UF..."
          />

          <MultiSearchableSelect
            label="Região"
            selectedValues={selectedRegioes}
            onChange={setSelectedRegioes}
            options={regiaoOptions}
            allLabel="Todas as Regiões"
            placeholder="Buscar região..."
          />
        </div>

        {/* Row 3: Quick Status Pill Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Atendimento:</span>
            
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-purple-100 text-[#401669] border border-purple-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todas as Empresas ({companySummaries.length})
            </button>

            <button
              onClick={() => setStatusFilter('assigned')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === 'assigned'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Com Comercial ({kpis.assignedCompanies})
            </button>

            <button
              onClick={() => setStatusFilter('unassigned')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === 'unassigned'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-amber-600" />
              Sem Comercial ({kpis.unassignedCompanies})
            </button>

            <button
              onClick={() => setStatusFilter('active_only')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                statusFilter === 'active_only'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Com Vagas Ativas
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1 border border-rose-200 cursor-pointer ml-auto sm:ml-2"
              >
                <X className="w-3 h-3" />
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-bold text-slate-500">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#401669]"
            >
              <option value="actives">Mais Alocados Ativos</option>
              <option value="total">Total Histórico</option>
              <option value="name">Nome da Empresa</option>
              <option value="rep">Comercial Responsável</option>
              <option value="grupo">Grupo Econômico</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
              title={sortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-2">
        <div>
          Mostrando <strong className="text-slate-800">{filteredCompanies.length}</strong> de {companySummaries.length} empresas catalogadas
          {hasActiveFilters && <span className="text-purple-700 font-semibold ml-1">(com filtros aplicados)</span>}
        </div>
        {viewMode === 'by_commercial' && (
          <div>
            Agrupado em <strong className="text-slate-800">{repAggregates.length}</strong> executivos comerciais / categorias
          </div>
        )}
      </div>

      {/* VIEW 1: COMPANIES GRID (CARDS) */}
      {viewMode === 'companies_grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((comp) => {
            const hasRep = Boolean(comp.assignedRep);
            return (
              <div
                key={comp.clientName}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all hover:border-purple-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Client name & CNPJ */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100/70 border border-purple-200 flex items-center justify-center text-[#401669] font-black text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                        {comp.clientName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#401669] transition-colors line-clamp-1" title={comp.clientName}>
                          {comp.clientName}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-1" title={comp.empresa}>
                          {comp.empresa !== comp.clientName ? comp.empresa : (comp.cnpj ? `CNPJ: ${comp.cnpj}` : 'Empresa / Conta')}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg flex-shrink-0">
                      {comp.activeWorkers} {comp.activeWorkers === 1 ? 'ativo' : 'ativos'}
                    </span>
                  </div>

                  {/* Grupo Econômico Badge */}
                  {comp.grupoEconomico && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-600 font-medium max-w-full">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{comp.grupoEconomico}</span>
                    </div>
                  )}

                  {/* Commercial Rep Box (Highlighted) */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/80 to-purple-100/30 border border-purple-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        hasRep ? 'bg-[#401669] text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {hasRep ? <UserCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-[#401669] tracking-wider block">
                          Comercial Responsável
                        </span>
                        <p className="text-xs font-black text-slate-900 truncate" title={comp.assignedRep || 'Sem comercial atribuído'}>
                          {comp.assignedRep || <span className="text-amber-700 font-semibold italic">Sem comercial atribuído</span>}
                        </p>
                        {comp.repDetails?.email && (
                          <span className="text-[10px] text-purple-700 block truncate" title={comp.repDetails.email}>
                            {comp.repDetails.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasRep && (
                      <button
                        onClick={() => handleCopy(comp.assignedRep, `rep_${comp.clientName}`)}
                        className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-[#401669] border border-purple-200 transition-all cursor-pointer flex-shrink-0"
                        title="Copiar nome do comercial"
                      >
                        {copiedText === `rep_${comp.clientName}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Statistics / Operations pills */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">Histórico Total:</span>
                      <strong className="text-slate-800 font-bold">{comp.totalWorkers} alocados</strong>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-400 text-[10px] block">Regiões / UFs:</span>
                      <strong className="text-slate-800 font-bold truncate block" title={comp.ufsList.join(', ') || 'Geral'}>
                        {comp.ufsList.join(', ') || comp.regioesList[0] || 'Geral'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Detail Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    {comp.lastAdmission ? `Última adm: ${comp.lastAdmission}` : 'Sem adm recente'}
                  </div>

                  <button
                    onClick={() => setSelectedCompanyModal(comp)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#401669] text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-purple-200/60"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Detalhes</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: COMPANIES TABLE */}
      {viewMode === 'companies_table' && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Empresa / Cliente</th>
                  <th className="py-3.5 px-4">Grupo Econômico</th>
                  <th className="py-3.5 px-4">Comercial Responsável</th>
                  <th className="py-3.5 px-4 text-center">Ativos</th>
                  <th className="py-3.5 px-4 text-center">Histórico</th>
                  <th className="py-3.5 px-4">Localidades</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((comp) => {
                  const hasRep = Boolean(comp.assignedRep);
                  return (
                    <tr key={comp.clientName} className="hover:bg-purple-50/40 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-[#401669] text-xs">
                          {comp.clientName}
                        </div>
                        {comp.cnpj && <div className="text-[10px] text-slate-400 font-normal">CNPJ: {comp.cnpj}</div>}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {comp.grupoEconomico || <span className="text-slate-400 italic">-</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasRep ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#401669] text-white flex items-center justify-center text-[10px] font-bold">
                              {comp.assignedRep.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{comp.assignedRep}</span>
                              {comp.repDetails?.email && (
                                <span className="text-[10px] text-purple-700 block">{comp.repDetails.email}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Sem Comercial
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg border border-emerald-100">
                          {comp.activeWorkers}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">
                        {comp.totalWorkers}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-[160px] truncate" title={comp.cidadesList.join(', ') || 'Geral'}>
                        {comp.ufsList.join(', ') || comp.cidadesList[0] || 'Geral'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedCompanyModal(comp)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 text-[#401669] rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer border border-slate-200"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: AGGREGATED BY COMMERCIAL REP */}
      {viewMode === 'by_commercial' && (
        <div className="space-y-4">
          {repAggregates.map((rep) => {
            const isUnassigned = rep.repName === 'Sem Comercial Atribuído';
            return (
              <div
                key={rep.repName}
                className={`bg-white rounded-3xl p-5 border shadow-xs transition-all ${
                  isUnassigned ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200/90'
                }`}
              >
                {/* Rep Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-xs ${
                      isUnassigned ? 'bg-amber-100 text-amber-800' : 'bg-[#401669] text-white'
                    }`}>
                      {isUnassigned ? <AlertCircle className="w-6 h-6" /> : rep.repName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{rep.repName}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          isUnassigned ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-900'
                        }`}>
                          {rep.companies.length} {rep.companies.length === 1 ? 'empresa atendida' : 'empresas atendidas'}
                        </span>
                      </div>
                      {rep.repDetails && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          {rep.repDetails.email && (
                            <span className="flex items-center gap-1 text-purple-700">
                              <Mail className="w-3.5 h-3.5" />
                              {rep.repDetails.email}
                            </span>
                          )}
                          {rep.repDetails.phone && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3.5 h-3.5" />
                              {rep.repDetails.phone}
                            </span>
                          )}
                          {rep.repDetails.role && (
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              Nível: {rep.repDetails.role}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Alocados Ativos</span>
                      <strong className="text-sm font-black text-emerald-700">{rep.activeWorkers}</strong>
                    </div>

                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Grupos Econômicos</span>
                      <strong className="text-sm font-black text-slate-800">{rep.gruposSet.size}</strong>
                    </div>
                  </div>
                </div>

                {/* Sub-grid of companies for this representative */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {rep.companies.map((c) => (
                    <div
                      key={c.clientName}
                      onClick={() => setSelectedCompanyModal(c)}
                      className="p-3 bg-slate-50/80 hover:bg-purple-50/60 rounded-2xl border border-slate-200/70 hover:border-purple-200 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#401669] truncate" title={c.clientName}>
                          {c.clientName}
                        </h4>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {c.grupoEconomico || (c.cnpj ? `CNPJ: ${c.cnpj}` : 'Empresa')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="px-2 py-0.5 bg-white text-emerald-700 text-[10px] font-extrabold rounded-lg border border-slate-200">
                          {c.activeWorkers} ativos
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPANY DETAIL MODAL */}
      {selectedCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2c0d4a] via-[#401669] to-[#250a40] text-white p-6 relative flex-shrink-0">
              <button
                onClick={() => setSelectedCompanyModal(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 font-black text-lg border border-white/20">
                  {selectedCompanyModal.clientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-purple-400/20 text-purple-200 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    Detalhes da Empresa &amp; Atendimento
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">{selectedCompanyModal.clientName}</h2>
                  <p className="text-xs text-purple-200/80">
                    {selectedCompanyModal.empresa !== selectedCompanyModal.clientName ? selectedCompanyModal.empresa : 'Conta Corporativa'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-5 overflow-y-auto">
              
              {/* Highlighted Commercial Contact Card */}
              <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${
                    selectedCompanyModal.assignedRep ? 'bg-[#401669]' : 'bg-amber-600'
                  }`}>
                    {selectedCompanyModal.assignedRep ? <UserCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#401669] tracking-wider block">
                      Executivo Comercial Responsável
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      {selectedCompanyModal.assignedRep || 'Sem comercial atribuído'}
                    </h3>
                    {selectedCompanyModal.repDetails?.email && (
                      <p className="text-xs text-purple-800 font-medium">{selectedCompanyModal.repDetails.email}</p>
                    )}
                  </div>
                </div>

                {selectedCompanyModal.assignedRep && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(selectedCompanyModal.assignedRep, 'modal_rep')}
                      className="px-3 py-1.5 bg-white text-[#401669] hover:bg-purple-100 text-xs font-bold rounded-xl transition-all border border-purple-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedText === 'modal_rep' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar Nome</span>
                    </button>
                    {selectedCompanyModal.repDetails?.email && (
                      <button
                        onClick={() => handleCopy(selectedCompanyModal.repDetails?.email || '', 'modal_email')}
                        className="px-3 py-1.5 bg-[#401669] text-white hover:bg-purple-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedText === 'modal_email' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Mail className="w-3.5 h-3.5" />}
                        <span>Copiar E-mail</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Company Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Grupo Econômico</span>
                  <strong className="text-slate-800 text-xs font-bold block truncate" title={selectedCompanyModal.grupoEconomico}>
                    {selectedCompanyModal.grupoEconomico || 'Geral'}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">CNPJ Cliente</span>
                  <strong className="text-slate-800 text-xs font-bold block">
                    {selectedCompanyModal.cnpj || 'Não informado'}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Alocados Ativos</span>
                  <strong className="text-emerald-700 text-sm font-black block">
                    {selectedCompanyModal.activeWorkers}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Histórico</span>
                  <strong className="text-slate-800 text-sm font-bold block">
                    {selectedCompanyModal.totalWorkers}
                  </strong>
                </div>
              </div>

              {/* Workers List in this Company */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#401669]" />
                    Colaboradores Alocados ({selectedCompanyModal.workers.length})
                  </h4>

                  <input
                    type="text"
                    placeholder="Filtrar por nome ou cargo nesta empresa..."
                    value={modalWorkerSearch}
                    onChange={(e) => setModalWorkerSearch(e.target.value)}
                    className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#401669]"
                  />
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {selectedCompanyModal.workers
                    .filter((w) => {
                      if (!modalWorkerSearch) return true;
                      const term = modalWorkerSearch.toLowerCase();
                      return w.nome.toLowerCase().includes(term) || w.cargo.toLowerCase().includes(term);
                    })
                    .slice(0, 50)
                    .map((w) => (
                      <div
                        key={w.id}
                        onClick={() => {
                          if (onSelectWorker) onSelectWorker(w);
                        }}
                        className="p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-[#401669] truncate">
                            {w.nome}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{w.cargo}</span>
                            <span>•</span>
                            <span>{w.cidade || w.regiao}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            w.isAtivo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {w.isAtivo ? 'ATIVO' : 'DESLIGADO'}
                          </span>
                          <span className="text-slate-400 text-[10px]">{w.dataAdmissao}</span>
                        </div>
                      </div>
                    ))}

                  {selectedCompanyModal.workers.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Nenhum colaborador registrado nesta conta no momento.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCompanyModal(null)}
                className="px-5 py-2 bg-[#401669] text-white font-bold text-xs rounded-xl hover:bg-purple-900 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
