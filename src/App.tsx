import React, { useState, useEffect, useMemo } from 'react';
import { FuncionarioRaw, Funcionario, FilterOptions, DashboardMetrics, User } from './types';
import { normalizeFuncionario, calculateMetrics } from './utils/dataParser';
import { saveLocalCache, getLocalCache } from './utils/localCache';
import { getCurrentUserFromStorage, logoutUser } from './services/userService';
import { fallbackData } from './data/mockData';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KPICards } from './components/KPICards';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { OverviewTab } from './components/tabs/OverviewTab';
import { TemporalTab } from './components/tabs/TemporalTab';
import { VacanciesAndSalariesTab } from './components/tabs/VacanciesAndSalariesTab';
import { EconomicGroupsTab } from './components/tabs/EconomicGroupsTab';
import { RegionalTab } from './components/tabs/RegionalTab';
import { DataTableTab } from './components/tabs/DataTableTab';
import { ContractExpirationsTab } from './components/tabs/ContractExpirationsTab';
import { TalentBankTab } from './components/tabs/TalentBankTab';
import { CommercialPortfolioTab } from './components/tabs/CommercialPortfolioTab';
import { CommercialManagementTab } from './components/tabs/CommercialManagementTab';
import { Footer } from './components/Footer';
import { EmployeeModal } from './components/EmployeeModal';
import { LayoutDashboard, Calendar, Briefcase, Building2, MapPin, Table, AlertTriangle, UserCheck, FolderKanban, ChevronDown, BarChart3, Users, PieChart } from 'lucide-react';

const initialFilters: FilterOptions = {
  status: 'all',
  grupoEconomico: '',
  vinculo: '',
  ano: '',
  regiao: '',
  uf: '',
  cliente: '',
  cargo: '',
  searchQuery: '',
  minSalario: '',
  maxSalario: '',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUserFromStorage());
  const [isUsersModalOpen, setIsUsersModalOpen] = useState<boolean>(false);

  const [data, setData] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'live' | 'cache' | 'stale_cache' | 'fallback'>('live');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'temporal'
    | 'salaries'
    | 'regional'
    | 'contracts'
    | 'groups'
    | 'talent_bank'
    | 'table'
    | 'comercial_carteira'
    | 'comercial_gestao'
  >(() => {
    const role = currentUser?.role;
    if (role === 'RH') return 'talent_bank';
    if (role === 'Comercial') return 'comercial_carteira';
    if (role === 'Gerencial Comercial') return 'comercial_gestao';
    return 'overview';
  });

  const [isOutrosEstudosExpanded, setIsOutrosEstudosExpanded] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [selectedWorker, setSelectedWorker] = useState<Funcionario | null>(null);

  // Safety redirect for restricted roles
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'RH' && activeTab !== 'talent_bank') {
      setActiveTab('talent_bank');
    } else if (
      currentUser.role === 'Cliente' &&
      ['groups', 'talent_bank', 'comercial_carteira', 'comercial_gestao'].includes(activeTab)
    ) {
      setActiveTab('overview');
    }
  }, [currentUser, activeTab]);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Restrict base dataset for 'Cliente' role to their assigned grupoEconomicos & clientes
  const roleFilteredData = useMemo(() => {
    if (currentUser?.role === 'Cliente') {
      const userGroups =
        currentUser.gruposEconomicos && currentUser.gruposEconomicos.length > 0
          ? currentUser.gruposEconomicos.map((g) => g.toLowerCase().trim())
          : currentUser.grupoEconomico
          ? [currentUser.grupoEconomico.toLowerCase().trim()]
          : [];

      const userClients = (currentUser.clientesAtribuidos || []).map((c) => c.toLowerCase().trim());

      if (userGroups.length === 0 && userClients.length === 0) return data;

      return data.filter((item) => {
        const itemGroup = item.grupoEconomico.toLowerCase().trim();
        const itemClient = item.nomeCliente.toLowerCase().trim();
        const itemCnpj = item.cnpjCliente?.toLowerCase().trim() || '';

        const matchesGroup = userGroups.some((g) => itemGroup.includes(g) || g.includes(itemGroup));
        const matchesClient = userClients.some(
          (c) => itemClient.includes(c) || c.includes(itemClient) || (itemCnpj && itemCnpj.includes(c))
        );

        return matchesGroup || matchesClient;
      });
    }
    return data;
  }, [data, currentUser]);

  // Fetch function with fast failover, background revalidation & persistent cache saving
  const fetchData = async (forceRefresh = false, isBackground = false) => {
    if (isBackground) {
      setIsBackgroundUpdating(true);
    } else {
      setIsLoading(true);
    }

    const DIRECT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxovla2YdYk7bIHs4_Z9L8G2N63OtDYrzCQhjAbNvC-Ia3TsLcnWp58bX4GU9RU220R/exec';
    let rawData: any[] | null = null;
    let fetchedAt = new Date().toISOString();
    let source: 'live' | 'cache' | 'stale_cache' | 'fallback' = 'live';

    // 1. Try local server or Vercel serverless API endpoint (/api/alocados) with 12s fast timeout
    try {
      const url = forceRefresh ? '/api/alocados?refresh=true' : '/api/alocados';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            rawData = json.data;
            fetchedAt = json.fetchedAt || json.cachedAt || fetchedAt;
            source = (json.source as any) || 'live';
          }
        }
      }
    } catch (e) {
      console.warn('Endpoint /api/alocados demorou ou falhou:', e);
    }

    // 2. Fallback: fetch directly from public static asset /metarh_cache_18k.json (serves as base cache)
    if (!rawData || rawData.length === 0) {
      try {
        console.log('Carregando base do cache estático inicial /metarh_cache_18k.json...');
        const res = await fetch('/metarh_cache_18k.json');
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json) ? json : (json.data || []);
          if (Array.isArray(items) && items.length > 0) {
            rawData = items;
            source = 'cache';
            fetchedAt = json.fetchedAt || new Date().toISOString();
            console.log(`[Static Cache] Sucesso ao carregar ${items.length} registros do cache estático.`);
          }
        }
      } catch (e) {
        console.warn('Busca no arquivo de cache estático falhou:', e);
      }
    }

    // 3. If direct static file wasn't reached, fetch DIRECTLY from Google Apps Script
    if (!rawData || rawData.length === 0) {
      try {
        console.log('Iniciando busca direta de registros do Google Apps Script...');
        const res = await fetch(DIRECT_GOOGLE_SCRIPT_URL, {
          headers: { Accept: 'application/json, text/plain, */*' },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('[')) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rawData = parsed;
              source = 'live';
              fetchedAt = new Date().toISOString();
              console.log(`[Google Script Direct] Recebidos ${parsed.length} registros com sucesso!`);
            }
          }
        }
      } catch (e) {
        console.warn('Busca direta no Google Script falhou:', e);
      }
    }

    // 4. CORS Proxy Fallback
    if (!rawData || rawData.length === 0) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(DIRECT_GOOGLE_SCRIPT_URL)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const parsed = await res.json();
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawData = parsed;
            source = 'live';
            fetchedAt = new Date().toISOString();
          }
        }
      } catch (e) {
        console.warn('Busca via CORS proxy falhou:', e);
      }
    }

    // Process rawData if obtained
    if (rawData && rawData.length > 0) {
      const normalized = rawData.map((raw: FuncionarioRaw, idx: number) => normalizeFuncionario(raw, idx));
      setData(normalized);
      setDataSource(source);
      setLastUpdated(fetchedAt);

      // Save records into persistent IndexedDB cache asynchronously
      saveLocalCache({
        data: normalized,
        fetchedAt,
        source,
      }).catch((e) => console.warn('Erro ao salvar cache no IndexedDB:', e));
    } else {
      // 5. Final Fallback: restore from local cache IndexedDB or retry static cache
      const cached = await getLocalCache();
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        setData(cached.data);
        setLastUpdated(cached.fetchedAt);
        setDataSource('cache');
      } else {
        // Last-ditch fetch from static cache file
        try {
          const res = await fetch('/metarh_cache_18k.json');
          if (res.ok) {
            const json = await res.json();
            const items = Array.isArray(json) ? json : (json.data || []);
            if (Array.isArray(items) && items.length > 0) {
              const normalized = items.map((raw: FuncionarioRaw, idx: number) => normalizeFuncionario(raw, idx));
              setData(normalized);
              setDataSource('cache');
              setLastUpdated(json.fetchedAt || new Date().toISOString());
            }
          }
        } catch (err) {
          console.error('Falha crítica ao carregar base total:', err);
          if (data.length === 0) {
            const normalizedFallback = fallbackData.map((raw, idx) => normalizeFuncionario(raw, idx));
            setData(normalizedFallback);
            setDataSource('fallback');
            setLastUpdated(new Date().toISOString());
          }
        }
      }
    }

    setIsLoading(false);
    setIsBackgroundUpdating(false);
  };

  // Initial load: restore instantly from browser cache, then update in background
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const cached = await getLocalCache();
        if (cached && Array.isArray(cached.data) && cached.data.length >= 100) {
          setData(cached.data);
          setLastUpdated(cached.fetchedAt);
          setDataSource('cache');
          setIsLoading(false);

          // Revalidate in background with Google Sheets API
          fetchData(false, true);
          return;
        }
      } catch (err) {
        console.warn('Erro ao restaurar cache local:', err);
      }

      // If no cache, perform standard load
      fetchData(false, false);
    };

    initData();
  }, []);

  // Options for filter selects derived from whole dataset
  const availableGrupos = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => { if (d.grupoEconomico) set.add(d.grupoEconomico); });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableAnos = useMemo(() => {
    const set = new Set<number>();
    roleFilteredData.forEach((d) => {
      if (d.anoAdmissao) set.add(d.anoAdmissao);
      if (d.anoDemissao) set.add(d.anoDemissao);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [roleFilteredData]);

  const availableRegioes = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => { if (d.regiao) set.add(d.regiao); });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableUFs = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => { if (d.uf) set.add(d.uf); });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableVinculos = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => { if (d.vinculo) set.add(d.vinculo); });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableClientes = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => { if (d.nomeCliente) set.add(d.nomeCliente); });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  // Filtered dataset logic
  const filteredData = useMemo(() => {
    return roleFilteredData.filter((item) => {
      // Status filter
      if (filters.status === 'ativo' && !item.isAtivo) return false;
      if (filters.status === 'desligado' && item.isAtivo) return false;

      // Grupo Econômico
      if (filters.grupoEconomico && item.grupoEconomico !== filters.grupoEconomico) return false;

      // Vínculo Empregatício
      if (filters.vinculo && item.vinculo !== filters.vinculo) return false;

      // Ano filter
      if (filters.ano) {
        const anoNum = parseInt(filters.ano, 10);
        const matchesAdmissao = item.anoAdmissao === anoNum;
        const matchesDemissao = item.anoDemissao === anoNum;
        if (!matchesAdmissao && !matchesDemissao) return false;
      }

      // Região
      if (filters.regiao && item.regiao !== filters.regiao) return false;

      // Estado (UF)
      if (filters.uf && item.uf !== filters.uf) return false;

      // Cliente
      if (filters.cliente && item.nomeCliente !== filters.cliente) return false;

      // Cargo
      if (filters.cargo && item.cargo !== filters.cargo) return false;

      // Salário Min & Max
      if (filters.minSalario !== '' && item.salario < Number(filters.minSalario)) return false;
      if (filters.maxSalario !== '' && item.salario > Number(filters.maxSalario)) return false;

      // Global Search
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesSearch =
          item.nome.toLowerCase().includes(q) ||
          item.cargo.toLowerCase().includes(q) ||
          item.grupoEconomico.toLowerCase().includes(q) ||
          item.nomeCliente.toLowerCase().includes(q) ||
          item.regiao.toLowerCase().includes(q) ||
          String(item.id).includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [roleFilteredData, filters]);

  // Dashboard Metrics for filtered set
  const metrics = useMemo(() => calculateMetrics(filteredData), [filteredData]);

  // CSV Export handler
  const exportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      'Cód. Func.', 'Nome Funcionário', 'Status', 'Vínculo Empregatício', 'Salário Base (R$)',
      'Cargo ou Função', 'Grupo Econômico', 'Cliente', 'Região/Cidade', 'Data Admissão', 'Data Demissão', 'Motivo Desligamento'
    ];

    const rows = filteredData.map((d) => [
      d.id,
      `"${d.nome.replace(/"/g, '""')}"`,
      d.isAtivo ? 'ATIVO' : 'DESLIGADO',
      `"${d.vinculo.replace(/"/g, '""')}"`,
      d.salario.toFixed(2),
      `"${d.cargo.replace(/"/g, '""')}"`,
      `"${d.grupoEconomico.replace(/"/g, '""')}"`,
      `"${d.nomeCliente.replace(/"/g, '""')}"`,
      `"${d.regiao.replace(/"/g, '""')}"`,
      d.dataAdmissao,
      d.dataDemissao || '',
      `"${d.motivoDesligamento.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `METARH_Alocados_Filtrados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Barlow',sans-serif]">
      
      {/* App Header */}
      <Header
        metrics={metrics}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isBackgroundUpdating={isBackgroundUpdating}
        onRefresh={() => fetchData(true, false)}
        onExportCSV={exportCSV}
        dataSource={dataSource}
        currentUser={currentUser}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Global Filter Bar */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
          availableGrupos={availableGrupos}
          availableAnos={availableAnos}
          availableRegioes={availableRegioes}
          availableUFs={availableUFs}
          availableVinculos={availableVinculos}
          availableClientes={availableClientes}
          totalFilteredCount={filteredData.length}
          totalUnfilteredCount={roleFilteredData.length}
          currentUser={currentUser}
        />

        {/* Top KPI Summary Cards */}
        <KPICards metrics={metrics} />

        {/* Navigation Bar with Collapsible Outros Estudos */}
        {currentUser?.role === 'RH' ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-950">Acesso Restrito: Banco de Talentos RH</h2>
                <p className="text-xs text-emerald-700">
                  Pesquise ex-alocados para processos seletivos e novas oportunidades de recrutamento.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl">
              Perfil RH
            </span>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {/* Dedicated Commercial Modules Bar */}
            {(currentUser?.role === 'Comercial' ||
              currentUser?.role === 'Gerencial Comercial' ||
              currentUser?.role === 'Administrador') && (
              <div className="p-2 bg-gradient-to-r from-[#2c0d4a] via-[#401669] to-[#250a40] rounded-2xl border border-purple-900/50 shadow-sm flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-200 px-3 py-1.5 bg-white/10 rounded-xl flex-shrink-0 border border-white/10">
                    Módulos Comerciais:
                  </span>

                  {/* Dedicated Commercial Head Tab */}
                  {(currentUser?.role === 'Gerencial Comercial' || currentUser?.role === 'Administrador') && (
                    <button
                      onClick={() => setActiveTab('comercial_gestao')}
                      className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        activeTab === 'comercial_gestao'
                          ? 'bg-white text-[#2c0d4a] shadow-lg font-black ring-2 ring-purple-300 scale-102'
                          : 'bg-white/10 text-purple-100 hover:bg-white/20'
                      }`}
                    >
                      <Users className="w-4 h-4 text-purple-300" />
                      Gestão Equipe Comercial
                    </button>
                  )}

                  {/* Dedicated Commercial Rep Portfolio Tab */}
                  <button
                    onClick={() => setActiveTab('comercial_carteira')}
                    className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                      activeTab === 'comercial_carteira'
                        ? 'bg-white text-[#2c0d4a] shadow-lg font-black ring-2 ring-purple-300 scale-102'
                        : 'bg-white/10 text-purple-100 hover:bg-white/20'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-amber-300" />
                    Análise da Carteira Comercial
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-purple-200/80 hidden lg:block pr-2">
                  Estudos estratégicos de executivos &amp; contas
                </div>
              </div>
            )}

            {/* Main Analytics Bar (Análise Geral) */}
            <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/80 no-scrollbar items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 px-3 py-1 bg-slate-300/60 rounded-xl flex-shrink-0">
                  Visão &amp; Módulos:
                </span>

                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-[#401669] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Visão Geral
                </button>

                <button
                  onClick={() => setActiveTab('temporal')}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === 'temporal'
                      ? 'bg-[#401669] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Análise Temporal
                </button>

                <button
                  onClick={() => setActiveTab('salaries')}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === 'salaries'
                      ? 'bg-[#401669] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Ranking Vagas &amp; Salários
                </button>

                <button
                  onClick={() => setActiveTab('regional')}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === 'regional'
                      ? 'bg-[#401669] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Distribuição Regional
                </button>
              </div>

              {/* Circle Expansion Button for Outros Estudos */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300/80 flex-shrink-0 ml-auto">
                <span className="text-[10px] font-bold text-[#401669] hidden md:inline">
                  Outros Estudos
                </span>
                <button
                  onClick={() => setIsOutrosEstudosExpanded(!isOutrosEstudosExpanded)}
                  title={isOutrosEstudosExpanded ? "Recolher Outros Estudos" : "Expandir Outros Estudos"}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                    isOutrosEstudosExpanded || ['contracts', 'groups', 'talent_bank', 'table'].includes(activeTab)
                      ? 'bg-[#401669] text-white border-[#401669] shadow-xs'
                      : 'bg-white text-[#401669] border-slate-300 hover:bg-purple-100'
                  }`}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isOutrosEstudosExpanded || ['contracts', 'groups', 'talent_bank', 'table'].includes(activeTab)
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Expanded Outros Estudos Sub-Bar */}
            {(isOutrosEstudosExpanded || ['contracts', 'groups', 'talent_bank', 'table'].includes(activeTab)) && (
              <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-purple-50/90 rounded-2xl border border-purple-200/80 no-scrollbar items-center animate-fadeIn">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#401669] px-3 py-1 bg-purple-100/80 rounded-xl flex-shrink-0 flex items-center gap-1">
                  <FolderKanban className="w-3 h-3" /> Outros Estudos:
                </span>

                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === 'contracts'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-800 hover:bg-rose-100/70'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Contratos a Vencer
                </button>

                {currentUser?.role !== 'Cliente' && (
                  <>
                    <button
                      onClick={() => setActiveTab('groups')}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        activeTab === 'groups'
                          ? 'bg-[#401669] text-white shadow-xs'
                          : 'text-purple-900 hover:bg-purple-100/70'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      Grupos Econômicos
                    </button>

                    <button
                      onClick={() => setActiveTab('talent_bank')}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        activeTab === 'talent_bank'
                          ? 'bg-[#401669] text-white shadow-xs'
                          : 'text-purple-900 hover:bg-purple-100/70'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-amber-500 fill-amber-400" />
                      Banco de Talentos
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveTab('table')}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === 'table'
                      ? 'bg-[#401669] text-white shadow-xs'
                      : 'text-purple-900 hover:bg-purple-100/70'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  Tabela Completa
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content Rendering */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-slate-200">
            <div className="w-10 h-10 border-4 border-[#401669] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800">Carregando Banco de Dados METARH...</h3>
            <p className="text-xs text-slate-500 mt-1">Buscando base de alocações e movimentações do Google Apps Script em tempo real.</p>
          </div>
        ) : (
          <>
            {activeTab === 'comercial_carteira' && (
              <CommercialPortfolioTab
                data={roleFilteredData}
                currentUser={currentUser}
                availableClientes={availableClientes}
                onSelectWorker={(w) => setSelectedWorker(w)}
                onSelectClient={(clientName) => {
                  setFilters({ ...filters, cliente: clientName });
                  setActiveTab('overview');
                }}
                onUpdateCurrentUser={(updatedUser) => setCurrentUser(updatedUser)}
              />
            )}

            {activeTab === 'comercial_gestao' && (
              <CommercialManagementTab
                data={data}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'overview' && (
              <OverviewTab
                data={filteredData}
                metrics={metrics}
                selectedGrupoFilter={filters.grupoEconomico}
                selectedAnoFilter={filters.ano}
                onSelectGrupo={(grupo) => {
                  setFilters({ ...filters, grupoEconomico: grupo });
                  setActiveTab('groups');
                }}
                onSelectCargo={(cargo) => {
                  setFilters({ ...filters, cargo });
                  setActiveTab('salaries');
                }}
              />
            )}

            {activeTab === 'temporal' && (
              <TemporalTab
                data={filteredData}
                selectedAnoFilter={filters.ano}
                onSelectAno={(ano) => setFilters({ ...filters, ano })}
              />
            )}

            {activeTab === 'contracts' && (
              <ContractExpirationsTab
                data={filteredData}
                onSelectWorker={(w) => setSelectedWorker(w)}
              />
            )}

            {activeTab === 'salaries' && (
              <VacanciesAndSalariesTab
                data={filteredData}
                onSelectWorker={(w) => setSelectedWorker(w)}
                onSelectCargo={(cargo) => setFilters({ ...filters, cargo })}
              />
            )}

            {activeTab === 'groups' && (
              <EconomicGroupsTab
                data={filteredData}
                onSelectGrupo={(grupo) => setFilters({ ...filters, grupoEconomico: grupo })}
              />
            )}

            {activeTab === 'regional' && (
              <RegionalTab
                data={filteredData}
                onSelectRegiao={(regiao) => setFilters({ ...filters, regiao })}
              />
            )}

            {activeTab === 'talent_bank' && (
              <TalentBankTab
                data={roleFilteredData}
                onSelectWorker={(w) => setSelectedWorker(w)}
              />
            )}

            {activeTab === 'table' && (
              <DataTableTab
                data={filteredData}
                onSelectWorker={(w) => setSelectedWorker(w)}
                onExportCSV={exportCSV}
              />
            )}
          </>
        )}

      </main>

      {/* Detail Modal */}
      <EmployeeModal
        worker={selectedWorker}
        onClose={() => setSelectedWorker(null)}
      />

      {/* User Management Modal for Admin */}
      <UserManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        currentUser={currentUser}
        availableGrupos={availableGrupos}
        availableClientes={availableClientes}
        data={data}
      />

      {/* App Footer */}
      <Footer
        lastUpdated={lastUpdated}
        dataSource={dataSource}
        totalRecords={roleFilteredData.length}
      />

    </div>
  );
}
