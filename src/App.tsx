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
import { Footer } from './components/Footer';
import { EmployeeModal } from './components/EmployeeModal';
import { LayoutDashboard, Calendar, Briefcase, Building2, MapPin, Table, AlertTriangle, UserCheck, FolderKanban, ChevronDown } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'temporal' | 'salaries' | 'regional' | 'contracts' | 'groups' | 'talent_bank' | 'table'>('overview');
  const [isOutrosEstudosExpanded, setIsOutrosEstudosExpanded] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [selectedWorker, setSelectedWorker] = useState<Funcionario | null>(null);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Restrict base dataset for 'Cliente' role to their assigned grupoEconomico
  const roleFilteredData = useMemo(() => {
    if (currentUser?.role === 'Cliente' && currentUser.grupoEconomico) {
      const targetGroup = currentUser.grupoEconomico.toLowerCase().trim();
      return data.filter((item) =>
        item.grupoEconomico.toLowerCase().trim().includes(targetGroup) ||
        targetGroup.includes(item.grupoEconomico.toLowerCase().trim())
      );
    }
    return data;
  }, [data, currentUser]);

  // Fetch function with background revalidation & persistent cache saving
  const fetchData = async (forceRefresh = false, isBackground = false) => {
    if (isBackground) {
      setIsBackgroundUpdating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const url = forceRefresh ? '/api/alocados?refresh=true' : '/api/alocados';
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const normalized = json.data.map((raw: FuncionarioRaw, idx: number) => normalizeFuncionario(raw, idx));
        const fetchedAt = json.fetchedAt || json.cachedAt || new Date().toISOString();
        const source = json.source || 'live';

        setData(normalized);
        setDataSource(source);
        setLastUpdated(fetchedAt);

        // Save into persistent local storage asynchronously
        saveLocalCache({
          data: normalized,
          fetchedAt,
          source,
        }).catch((e) => console.warn('Erro ao salvar cache no navegador:', e));
      } else {
        throw new Error('Resposta vazia ou sem suporte da API');
      }
    } catch (err) {
      console.warn('Erro ao atualizar dados METARH:', err);
      if (data.length === 0) {
        const normalizedFallback = fallbackData.map((raw, idx) => normalizeFuncionario(raw, idx));
        setData(normalizedFallback);
        setDataSource('fallback');
        setLastUpdated(new Date().toISOString());
      }
    } finally {
      setIsLoading(false);
      setIsBackgroundUpdating(false);
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Barlow',sans-serif] pb-16">
      
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
          availableVinculos={availableVinculos}
          availableClientes={availableClientes}
          totalFilteredCount={filteredData.length}
          totalUnfilteredCount={roleFilteredData.length}
        />

        {/* Top KPI Summary Cards */}
        <KPICards metrics={metrics} />

        {/* Navigation Bar with Collapsible Outros Estudos */}
        <div className="space-y-2 mb-6">
          {/* Main Analytics Bar (Análise Geral) */}
          <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/80 no-scrollbar items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 px-3 py-1 bg-slate-300/60 rounded-xl flex-shrink-0">
                Análise Geral:
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
                Ranking Vagas & Salários
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

        {/* Tab Content Rendering */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-slate-200">
            <div className="w-10 h-10 border-4 border-[#401669] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800">Carregando Banco de Dados METARH...</h3>
            <p className="text-xs text-slate-500 mt-1">Buscando 18.000+ alocações diretamente do Google Apps Script.</p>
          </div>
        ) : (
          <>
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
      />

      {/* App Footer */}
      <Footer
        lastUpdated={lastUpdated}
        dataSource={dataSource}
        totalRecords={roleFilteredData.length || 18000}
      />

    </div>
  );
}
