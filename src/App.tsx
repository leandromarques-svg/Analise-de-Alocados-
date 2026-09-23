import React, { useState, useEffect, useMemo } from "react";
import { Funcionario, FilterOptions, DashboardMetrics, User } from "./types";
import {
  normalizeFuncionario,
  calculateMetrics,
  parseDateDetails,
} from "./utils/dataParser";
import {
  syncCommercialAssignmentsServer,
  getClientAssignments,
} from "./utils/commercialUtils";
import { getCurrentUserFromStorage, logoutUser } from "./services/userService";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { KPICards } from "./components/KPICards";
import { LoginScreen } from "./components/LoginScreen";
import { UserManagementModal } from "./components/UserManagementModal";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { TemporalTab } from "./components/tabs/TemporalTab";
import { VacanciesAndSalariesTab } from "./components/tabs/VacanciesAndSalariesTab";
import { EconomicGroupsTab } from "./components/tabs/EconomicGroupsTab";
import { RegionalTab } from "./components/tabs/RegionalTab";
import { DataTableTab } from "./components/tabs/DataTableTab";
import { ContractExpirationsTab } from "./components/tabs/ContractExpirationsTab";
import { TalentBankTab } from "./components/tabs/TalentBankTab";
import { CommercialPortfolioTab } from "./components/tabs/CommercialPortfolioTab";
import { CommercialManagementTab } from "./components/tabs/CommercialManagementTab";
import { CompanyCommercialsTab } from "./components/tabs/CompanyCommercialsTab";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { EmployeeModal } from "./components/EmployeeModal";
import { YearComparisonModal } from "./components/YearComparisonModal";
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Building2,
  MapPin,
  Table,
  AlertTriangle,
  UserCheck,
  FolderKanban,
  ChevronDown,
  BarChart3,
  Users,
  PieChart,
} from "lucide-react";

const initialFilters: FilterOptions = {
  status: "all",
  grupoEconomico: "",
  vinculo: "",
  ano: "",
  mes: "",
  regiao: "",
  uf: "",
  cliente: "",
  cnpj: "",
  comercial: "",
  cargo: "",
  searchQuery: "",
  minSalario: "",
  maxSalario: "",
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    getCurrentUserFromStorage(),
  );
  const [isUsersModalOpen, setIsUsersModalOpen] = useState<boolean>(false);

  const [data, setData] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackgroundUpdating, setIsBackgroundUpdating] =
    useState<boolean>(false);
  const [dataSource, setDataSource] = useState<
    "live" | "cache" | "stale_cache" | "fallback"
  >("live");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "temporal"
    | "salaries"
    | "regional"
    | "contracts"
    | "groups"
    | "talent_bank"
    | "rh_empresas_comerciais"
    | "table"
    | "comercial_carteira"
    | "comercial_gestao"
  >(() => {
    const role = currentUser?.role;
    if (role === "RH") return "rh_empresas_comerciais";
    if (role === "Comercial") return "comercial_carteira";
    if (role === "Gerencial Comercial") return "comercial_gestao";
    return "overview";
  });

  const [isOutrosEstudosExpanded, setIsOutrosEstudosExpanded] =
    useState<boolean>(false);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [selectedWorker, setSelectedWorker] = useState<Funcionario | null>(
    null,
  );
  const [isYearComparisonOpen, setIsYearComparisonOpen] =
    useState<boolean>(false);

  // Safety redirect for restricted roles
  useEffect(() => {
    if (!currentUser) return;
    if (
      currentUser.role === "RH" &&
      !["talent_bank", "rh_empresas_comerciais"].includes(activeTab)
    ) {
      setActiveTab("rh_empresas_comerciais");
    } else if (
      currentUser.role === "Cliente" &&
      [
        "groups",
        "talent_bank",
        "rh_empresas_comerciais",
        "comercial_carteira",
        "comercial_gestao",
      ].includes(activeTab)
    ) {
      setActiveTab("overview");
    }
  }, [currentUser, activeTab]);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Restrict base dataset for 'Cliente' role to their assigned grupoEconomicos & clientes
  const roleFilteredData = useMemo(() => {
    if (currentUser?.role === "Cliente") {
      const userGroups =
        currentUser.gruposEconomicos && currentUser.gruposEconomicos.length > 0
          ? currentUser.gruposEconomicos.map((g) => g.toLowerCase().trim())
          : currentUser.grupoEconomico
            ? [currentUser.grupoEconomico.toLowerCase().trim()]
            : [];

      const userClients = (currentUser.clientesAtribuidos || []).map((c) =>
        c.toLowerCase().trim(),
      );

      const matched =
        userGroups.length === 0 && userClients.length === 0
          ? data
          : data.filter((item) => {
              const itemGroup = item.grupoEconomico.toLowerCase().trim();
              const itemClient = item.nomeCliente.toLowerCase().trim();
              const itemCnpj = item.cnpjCliente?.toLowerCase().trim() || "";

              const matchesGroup = userGroups.some(
                (g) => itemGroup.includes(g) || g.includes(itemGroup),
              );
              const matchesClient = userClients.some(
                (c) =>
                  itemClient.includes(c) ||
                  c.includes(itemClient) ||
                  (itemCnpj && itemCnpj.includes(c)),
              );

              return matchesGroup || matchesClient;
            });

      // LGPD: Mask sensitive personal contact information for client-role users
      return matched.map((item) => ({
        ...item,
        telefone: item.telefone ? "Restrito (LGPD)" : "",
        celular: item.celular ? "Restrito (LGPD)" : "",
        emailCorporativo: item.emailCorporativo ? "Restrito (LGPD)" : "",
      }));
    }
    return data;
  }, [data, currentUser]);

  const fetchData = async (_forceRefresh = false, isBackground = false) => {
    if (isBackground) {
      setIsBackgroundUpdating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch(
        _forceRefresh ? "/api/alocados?refresh=1" : "/api/alocados",
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const rawData = Array.isArray(json.data) ? json.data : [];
      setData(
        rawData.map((raw: any, idx: number) => normalizeFuncionario(raw, idx)),
      );
      setDataSource(json.cached ? "cache" : "live");
      setLastUpdated(json.fetchedAt || new Date().toISOString());
    } catch (err) {
      console.warn("Falha ao carregar alocados do banco:", err);
      if (!isBackground) {
        setData([]);
        setDataSource("live");
      }
    } finally {
      setIsLoading(false);
      setIsBackgroundUpdating(false);
    }
  };

  useEffect(() => {
    syncCommercialAssignmentsServer().catch((e) =>
      console.warn("Sync de carteira comercial inicial falhou:", e),
    );
    fetchData(false, false);
  }, []);

  // Options for filter selects derived from whole dataset
  const availableGrupos = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => {
      if (d.grupoEconomico) set.add(d.grupoEconomico);
    });
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
    roleFilteredData.forEach((d) => {
      if (d.regiao) set.add(d.regiao);
    });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableUFs = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => {
      if (d.uf) set.add(d.uf);
    });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableVinculos = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => {
      if (d.vinculo) set.add(d.vinculo);
    });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableClientes = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => {
      if (d.nomeCliente) set.add(d.nomeCliente);
    });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const availableCNPJs = useMemo(() => {
    const set = new Set<string>();
    roleFilteredData.forEach((d) => {
      if (d.cnpjCliente) set.add(d.cnpjCliente);
    });
    return Array.from(set).sort();
  }, [roleFilteredData]);

  const clientAssignmentsMap = useMemo(() => {
    return getClientAssignments();
  }, [roleFilteredData, lastUpdated]);

  const availableComerciais = useMemo(() => {
    const set = new Set<string>();

    // Add all assigned commercial reps from carteira assignments
    Object.values(clientAssignmentsMap).forEach((rep) => {
      const repStr = String(rep || "").trim();
      if (repStr) {
        set.add(repStr);
      }
    });

    // Default executive names
    const defaultReps = [
      "Gabi Amorim",
      "Carol Giorgetti",
      "Leandro Marques",
      "Fernanda Bastos",
      "Camila Rocha",
    ];
    defaultReps.forEach((r) => set.add(r));

    // Option for unassigned
    set.add("Sem comercial atribuído");

    return Array.from(set).sort((a, b) => {
      if (a === "Sem comercial atribuído") return 1;
      if (b === "Sem comercial atribuído") return -1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [clientAssignmentsMap]);

  // Filtered dataset logic
  const filteredData = useMemo(() => {
    return roleFilteredData.filter((item) => {
      // Status filter
      if (filters.status === "ativo" && !item.isAtivo) return false;
      if (filters.status === "desligado" && item.isAtivo) return false;

      // Grupo Econômico
      if (
        filters.grupoEconomico &&
        item.grupoEconomico !== filters.grupoEconomico
      )
        return false;

      // Vínculo Empregatício
      if (filters.vinculo && item.vinculo !== filters.vinculo) return false;

      // Ano filter
      if (filters.ano) {
        const anoNum = parseInt(filters.ano, 10);
        const matchesAdmissao = item.anoAdmissao === anoNum;
        const matchesDemissao = item.anoDemissao === anoNum;
        if (!matchesAdmissao && !matchesDemissao) return false;
      }

      // Mês filter
      if (filters.mes) {
        const MONTH_NAMES_PT = [
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ];
        let mesNum = parseInt(filters.mes, 10);
        if (isNaN(mesNum)) {
          const idx = MONTH_NAMES_PT.findIndex(
            (m) => m.toLowerCase() === filters.mes.toLowerCase(),
          );
          if (idx !== -1) mesNum = idx + 1;
        }

        if (mesNum >= 1 && mesNum <= 12) {
          const admDetails = parseDateDetails(item.dataAdmissao);
          const demDetails = parseDateDetails(item.dataDemissao);

          let matchesAdmissao = admDetails.month === mesNum;
          let matchesDemissao = demDetails.month === mesNum;

          if (filters.ano) {
            const anoNum = parseInt(filters.ano, 10);
            matchesAdmissao = matchesAdmissao && item.anoAdmissao === anoNum;
            matchesDemissao = matchesDemissao && item.anoDemissao === anoNum;
          }

          if (!matchesAdmissao && !matchesDemissao) return false;
        }
      }

      // Região
      if (filters.regiao && item.regiao !== filters.regiao) return false;

      // Estado (UF)
      if (filters.uf && item.uf !== filters.uf) return false;

      // Cliente
      if (filters.cliente && item.nomeCliente !== filters.cliente) return false;

      // CNPJ
      if (filters.cnpj && item.cnpjCliente !== filters.cnpj) return false;

      // Atendimento Comercial
      const assignedRep = (
        clientAssignmentsMap[item.nomeCliente] ||
        (item.grupoEconomico
          ? clientAssignmentsMap[item.grupoEconomico]
          : "") ||
        ""
      ).trim();

      if (filters.comercial) {
        const target = filters.comercial.toLowerCase().trim();
        const currentRep = assignedRep.toLowerCase().trim();

        if (
          target === "sem comercial atribuído" ||
          target === "sem comercial"
        ) {
          if (currentRep !== "") return false;
        } else {
          if (!currentRep) return false;
          const normTarget = target.replace(/_/g, " ");
          const normRep = currentRep.replace(/_/g, " ");
          const matches =
            normRep === normTarget ||
            normRep.includes(normTarget) ||
            normTarget.includes(normRep);
          if (!matches) return false;
        }
      }

      // Cargo
      if (filters.cargo && item.cargo !== filters.cargo) return false;

      // Salário Min & Max
      if (
        filters.minSalario !== "" &&
        item.salario < Number(filters.minSalario)
      )
        return false;
      if (
        filters.maxSalario !== "" &&
        item.salario > Number(filters.maxSalario)
      )
        return false;

      // Global Search
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesSearch =
          item.nome.toLowerCase().includes(q) ||
          item.cargo.toLowerCase().includes(q) ||
          item.grupoEconomico.toLowerCase().includes(q) ||
          item.nomeCliente.toLowerCase().includes(q) ||
          (item.cnpjCliente && item.cnpjCliente.toLowerCase().includes(q)) ||
          assignedRep.toLowerCase().includes(q) ||
          item.regiao.toLowerCase().includes(q) ||
          String(item.id).includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [roleFilteredData, filters, clientAssignmentsMap]);

  // Dashboard Metrics for filtered set
  const metrics = useMemo(() => calculateMetrics(filteredData), [filteredData]);

  // CSV Export handler
  const exportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      "Cód. Func.",
      "Nome Funcionário",
      "Status",
      "Vínculo Empregatício",
      "Salário Base (R$)",
      "Cargo ou Função",
      "Grupo Econômico",
      "Cliente",
      "Região/Cidade",
      "Data Admissão",
      "Data Demissão",
      "Motivo Desligamento",
    ];

    const rows = filteredData.map((d) => [
      d.id,
      `"${d.nome.replace(/"/g, '""')}"`,
      d.isAtivo ? "ATIVO" : "DESLIGADO",
      `"${d.vinculo.replace(/"/g, '""')}"`,
      d.salario.toFixed(2),
      `"${d.cargo.replace(/"/g, '""')}"`,
      `"${d.grupoEconomico.replace(/"/g, '""')}"`,
      `"${d.nomeCliente.replace(/"/g, '""')}"`,
      `"${d.regiao.replace(/"/g, '""')}"`,
      d.dataAdmissao,
      d.dataDemissao || "",
      `"${d.motivoDesligamento.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `METARH_Alocados_Filtrados_${new Date().toISOString().slice(0, 10)}.csv`,
    );
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
          onOpenYearComparison={() => setIsYearComparisonOpen(true)}
          availableGrupos={availableGrupos}
          availableAnos={availableAnos}
          availableRegioes={availableRegioes}
          availableUFs={availableUFs}
          availableVinculos={availableVinculos}
          availableClientes={availableClientes}
          availableCNPJs={availableCNPJs}
          availableComerciais={availableComerciais}
          totalFilteredCount={filteredData.length}
          totalUnfilteredCount={roleFilteredData.length}
          currentUser={currentUser}
        />

        {/* Top KPI Summary Cards */}
        <KPICards metrics={metrics} />

        {/* Navigation Bar with Collapsible Outros Estudos */}
        {currentUser?.role === "RH" ? (
          <div className="space-y-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-emerald-950 via-[#134e4a] to-[#064e3b] rounded-2xl border border-emerald-800/50 shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 no-scrollbar">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-200 px-3 py-1.5 bg-white/10 rounded-xl flex-shrink-0 border border-white/10">
                  Módulos de RH:
                </span>

                <button
                  onClick={() => setActiveTab("rh_empresas_comerciais")}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "rh_empresas_comerciais"
                      ? "bg-white text-emerald-950 shadow-md font-black ring-2 ring-emerald-300"
                      : "bg-white/10 text-emerald-100 hover:bg-white/20"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-amber-300" />
                  Comerciais por Empresa
                </button>

                <button
                  onClick={() => setActiveTab("talent_bank")}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "talent_bank"
                      ? "bg-white text-emerald-950 shadow-md font-black ring-2 ring-emerald-300"
                      : "bg-white/10 text-emerald-100 hover:bg-white/20"
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Banco de Talentos
                </button>
              </div>

              <div className="text-[11px] font-semibold text-emerald-200/80 hidden lg:block pr-2">
                Consulta de executivos comerciais &amp; recrutamento de talentos
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {/* Dedicated Commercial Modules Bar */}
            {(currentUser?.role === "Comercial" ||
              currentUser?.role === "Gerencial Comercial" ||
              currentUser?.role === "Administrador") && (
              <div className="p-2 bg-gradient-to-r from-[#2c0d4a] via-[#401669] to-[#250a40] rounded-2xl border border-purple-900/50 shadow-sm flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 no-scrollbar">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-200 px-3 py-1.5 bg-white/10 rounded-xl flex-shrink-0 border border-white/10">
                    Módulos Comerciais:
                  </span>

                  {/* Dedicated Commercial Head Tab */}
                  {(currentUser?.role === "Gerencial Comercial" ||
                    currentUser?.role === "Administrador") && (
                    <button
                      onClick={() => setActiveTab("comercial_gestao")}
                      className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        activeTab === "comercial_gestao"
                          ? "bg-white text-[#2c0d4a] shadow-md font-black ring-2 ring-purple-300"
                          : "bg-white/10 text-purple-100 hover:bg-white/20"
                      }`}
                    >
                      <Users className="w-4 h-4 text-purple-300" />
                      Gestão Equipe Comercial
                    </button>
                  )}

                  {/* Dedicated Commercial Rep Portfolio Tab */}
                  <button
                    onClick={() => setActiveTab("comercial_carteira")}
                    className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                      activeTab === "comercial_carteira"
                        ? "bg-white text-[#2c0d4a] shadow-md font-black ring-2 ring-purple-300"
                        : "bg-white/10 text-purple-100 hover:bg-white/20"
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
                  onClick={() => setActiveTab("overview")}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-[#401669] text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/50"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Visão Geral
                </button>

                <button
                  onClick={() => setActiveTab("temporal")}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "temporal"
                      ? "bg-[#401669] text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/50"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Análise Temporal
                </button>

                <button
                  onClick={() => setActiveTab("salaries")}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "salaries"
                      ? "bg-[#401669] text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/50"
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Ranking Vagas &amp; Salários
                </button>

                <button
                  onClick={() => setActiveTab("regional")}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "regional"
                      ? "bg-[#401669] text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/50"
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
                  onClick={() =>
                    setIsOutrosEstudosExpanded(!isOutrosEstudosExpanded)
                  }
                  title={
                    isOutrosEstudosExpanded
                      ? "Recolher Outros Estudos"
                      : "Expandir Outros Estudos"
                  }
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                    isOutrosEstudosExpanded ||
                    [
                      "contracts",
                      "groups",
                      "rh_empresas_comerciais",
                      "talent_bank",
                      "table",
                    ].includes(activeTab)
                      ? "bg-[#401669] text-white border-[#401669] shadow-xs"
                      : "bg-white text-[#401669] border-slate-300 hover:bg-purple-100"
                  }`}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isOutrosEstudosExpanded ||
                      [
                        "contracts",
                        "groups",
                        "rh_empresas_comerciais",
                        "talent_bank",
                        "table",
                      ].includes(activeTab)
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Expanded Outros Estudos Sub-Bar */}
            {(isOutrosEstudosExpanded ||
              [
                "contracts",
                "groups",
                "rh_empresas_comerciais",
                "talent_bank",
                "table",
              ].includes(activeTab)) && (
              <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-purple-50/90 rounded-2xl border border-purple-200/80 no-scrollbar items-center animate-fadeIn">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#401669] px-3 py-1 bg-purple-100/80 rounded-xl flex-shrink-0 flex items-center gap-1">
                  <FolderKanban className="w-3 h-3" /> Outros Estudos:
                </span>

                <button
                  onClick={() => setActiveTab("contracts")}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "contracts"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-rose-800 hover:bg-rose-100/70"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Contratos a Vencer
                </button>

                {currentUser?.role !== "Cliente" && (
                  <>
                    <button
                      onClick={() => setActiveTab("groups")}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        activeTab === "groups"
                          ? "bg-[#401669] text-white shadow-xs"
                          : "text-purple-900 hover:bg-purple-100/70"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      Grupos Econômicos
                    </button>

                    <button
                      onClick={() => setActiveTab("rh_empresas_comerciais")}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        activeTab === "rh_empresas_comerciais"
                          ? "bg-[#401669] text-white shadow-xs"
                          : "text-purple-900 hover:bg-purple-100/70"
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-amber-400" />
                      Comerciais por Empresa
                    </button>

                    <button
                      onClick={() => setActiveTab("talent_bank")}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        activeTab === "talent_bank"
                          ? "bg-[#401669] text-white shadow-xs"
                          : "text-purple-900 hover:bg-purple-100/70"
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-amber-500 fill-amber-400" />
                      Banco de Talentos
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveTab("table")}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                    activeTab === "table"
                      ? "bg-[#401669] text-white shadow-xs"
                      : "text-purple-900 hover:bg-purple-100/70"
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
            <h3 className="text-base font-bold text-slate-800">
              Carregando Banco de Dados METARH...
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Buscando alocados no banco SQL.
            </p>
          </div>
        ) : (
          <ErrorBoundary key={activeTab}>
            {activeTab === "comercial_carteira" && (
              <CommercialPortfolioTab
                data={roleFilteredData}
                currentUser={currentUser!}
                availableClientes={availableClientes}
                onSelectWorker={(w) => setSelectedWorker(w)}
                onSelectClient={(clientName) => {
                  setFilters({ ...filters, cliente: clientName });
                  setActiveTab("overview");
                }}
                onUpdateCurrentUser={(updatedUser) =>
                  setCurrentUser(updatedUser)
                }
              />
            )}

            {activeTab === "comercial_gestao" && (
              <CommercialManagementTab data={data} currentUser={currentUser!} />
            )}

            {activeTab === "overview" && (
              <OverviewTab
                data={filteredData}
                metrics={metrics}
                selectedGrupoFilter={filters.grupoEconomico}
                selectedAnoFilter={filters.ano}
                onSelectGrupo={(grupo) => {
                  setFilters({ ...filters, grupoEconomico: grupo });
                  setActiveTab("groups");
                }}
                onSelectCargo={(cargo) => {
                  setFilters({ ...filters, cargo });
                  setActiveTab("salaries");
                }}
              />
            )}

            {activeTab === "temporal" && (
              <TemporalTab
                data={filteredData}
                selectedAnoFilter={filters.ano}
                onSelectAno={(ano) => setFilters({ ...filters, ano })}
                onOpenYearComparison={() => setIsYearComparisonOpen(true)}
              />
            )}

            {activeTab === "contracts" && (
              <ContractExpirationsTab
                data={filteredData}
                onSelectWorker={(w) => setSelectedWorker(w)}
              />
            )}

            {activeTab === "salaries" && (
              <VacanciesAndSalariesTab
                data={filteredData}
                onSelectWorker={(w) => setSelectedWorker(w)}
                onSelectCargo={(cargo) => setFilters({ ...filters, cargo })}
              />
            )}

            {activeTab === "groups" && (
              <EconomicGroupsTab
                data={filteredData}
                onSelectGrupo={(grupo) =>
                  setFilters({ ...filters, grupoEconomico: grupo })
                }
              />
            )}

            {activeTab === "regional" && (
              <RegionalTab
                data={filteredData}
                onSelectRegiao={(regiao) => setFilters({ ...filters, regiao })}
              />
            )}

            {activeTab === "talent_bank" && (
              <TalentBankTab
                data={roleFilteredData}
                clientAssignmentsMap={clientAssignmentsMap}
                onSelectWorker={(w) => setSelectedWorker(w)}
              />
            )}

            {activeTab === "rh_empresas_comerciais" && (
              <CompanyCommercialsTab
                data={roleFilteredData}
                clientAssignmentsMap={clientAssignmentsMap}
                onSelectWorker={(w) => setSelectedWorker(w)}
              />
            )}

            {activeTab === "table" && (
              <DataTableTab
                data={filteredData}
                onSelectWorker={(w) => setSelectedWorker(w)}
                onExportCSV={exportCSV}
                isClientRole={currentUser?.role === "Cliente"}
              />
            )}
          </ErrorBoundary>
        )}
      </main>

      {/* Detail Modal */}
      <EmployeeModal
        worker={selectedWorker}
        isClientRole={currentUser?.role === "Cliente"}
        assignedRep={
          selectedWorker
            ? (
                clientAssignmentsMap[selectedWorker.nomeCliente] ||
                (selectedWorker.grupoEconomico
                  ? clientAssignmentsMap[selectedWorker.grupoEconomico]
                  : "") ||
                ""
              ).trim()
            : ""
        }
        onClose={() => setSelectedWorker(null)}
      />

      {/* Year Comparison Modal */}
      <YearComparisonModal
        isOpen={isYearComparisonOpen}
        onClose={() => setIsYearComparisonOpen(false)}
        filteredData={filteredData}
        allData={roleFilteredData}
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
