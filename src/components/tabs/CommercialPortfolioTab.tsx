import React, { useState, useMemo, useEffect } from 'react';
import { Funcionario, User } from '../../types';
import { saveUser, setCurrentUser, saveCommercialAssignments, getCommercialAssignments } from '../../services/userService';
import {
  analyzePortfolioForPeriod,
  saveClientAssignment,
  getClientAssignments,
} from '../../utils/commercialUtils';
import { CommercialAnalyticsCharts } from '../CommercialAnalyticsCharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Users,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  Search,
  Check,
  Plus,
  BarChart3,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Briefcase,
  Filter,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
} from 'lucide-react';

interface CommercialPortfolioTabProps {
  data: Funcionario[];
  currentUser: User;
  availableClientes: string[];
  onSelectWorker?: (worker: Funcionario) => void;
  onUpdateCurrentUser?: (updatedUser: User) => void;
}

export const CommercialPortfolioTab: React.FC<CommercialPortfolioTabProps> = ({
  data,
  currentUser,
  availableClientes,
  onSelectWorker,
  onUpdateCurrentUser,
}) => {
  const [selectedPeriodMonths, setSelectedPeriodMonths] = useState<number>(3);
  const [searchTerm, setSearchTerm] = useState('');
  const [grupoSearchTerm, setGrupoSearchTerm] = useState('');
  const [activeSelectionTab, setActiveSelectionTab] = useState<'grupos' | 'clientes'>('grupos');
  const [isSelectionExpanded, setIsSelectionExpanded] = useState<boolean>(false);
  // Calculate initial portfolio assigned clients based on user profile (clientesAtribuidos and gruposEconomicos)
  const initialClients = useMemo(() => {
    const set = new Set<string>(currentUser.clientesAtribuidos || []);
    const groups = currentUser.gruposEconomicos || (currentUser.grupoEconomico ? [currentUser.grupoEconomico] : []);
    groups.forEach((groupName) => {
      if (!groupName) return;
      const gLower = groupName.toLowerCase().trim();
      data.forEach((w) => {
        const grp = w.grupoEconomico?.toLowerCase().trim() || '';
        if (grp === gLower || grp.includes(gLower) || gLower.includes(grp)) {
          if (w.nomeCliente) set.add(w.nomeCliente);
        }
      });
    });
    return Array.from(set);
  }, [currentUser, data]);

  const [assignedClients, setAssignedClients] = useState<string[]>(initialClients);

  // Keep assignedClients state in sync when currentUser profile or remote assignments update
  useEffect(() => {
    let isMounted = true;
    setAssignedClients(initialClients);

    // Also attempt fetching from dedicated commercial assignments DB
    if (currentUser.username) {
      getCommercialAssignments(currentUser.username).then((assignments) => {
        if (!isMounted || !Array.isArray(assignments) || assignments.length === 0) return;
        const set = new Set<string>(initialClients);
        assignments.forEach((item) => {
          const cli = item['Nome Cliente'];
          const grp = item['Grupo Economico'];
          if (cli) set.add(cli);
          if (grp) {
            const gLower = grp.toLowerCase().trim();
            data.forEach((w) => {
              const wGrp = w.grupoEconomico?.toLowerCase().trim() || '';
              if (wGrp === gLower || wGrp.includes(gLower) || gLower.includes(wGrp)) {
                if (w.nomeCliente) set.add(w.nomeCliente);
              }
            });
          }
        });
        if (set.size > 0) {
          setAssignedClients(Array.from(set));
        }
      });
    }

    return () => { isMounted = false; };
  }, [currentUser.username, currentUser.clientesAtribuidos, currentUser.gruposEconomicos, currentUser.grupoEconomico, initialClients, data]);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Check if current local selection differs from user profile
  const isDirty = useMemo(() => {
    const currentAssigned = [...(currentUser.clientesAtribuidos || [])].sort();
    const nowAssigned = [...assignedClients].sort();
    return JSON.stringify(currentAssigned) !== JSON.stringify(nowAssigned);
  }, [currentUser.clientesAtribuidos, assignedClients]);

  // Handler to permanently save portfolio selection to user profile
  const handleSavePortfolioToProfile = async () => {
    setIsSavingProfile(true);
    try {
      const selectedGroupsSet = new Set<string>();
      const clientGroupMappings: Record<string, string> = {};

      assignedClients.forEach((client) => {
        const match = data.find((w) => w.nomeCliente.toLowerCase() === client.toLowerCase());
        if (match && match.grupoEconomico) {
          const gLower = match.grupoEconomico.toLowerCase().trim();
          if (gLower !== 'outros' && gLower !== 'sem grupo') {
            selectedGroupsSet.add(match.grupoEconomico);
            clientGroupMappings[client] = match.grupoEconomico;
          } else {
            clientGroupMappings[client] = '';
          }
        } else {
          clientGroupMappings[client] = '';
        }
      });

      const updatedUser: User = {
        ...currentUser,
        clientesAtribuidos: assignedClients,
        gruposEconomicos: Array.from(selectedGroupsSet),
        grupoEconomico: Array.from(selectedGroupsSet)[0] || currentUser.grupoEconomico || '',
      };

      // 1. Save user profile
      await saveUser(updatedUser);

      // 2. Save explicitly to dedicated Commercial Carteira Spreadsheet DB (Colunas: Grupo Economico, Nome Cliente, Comercial)
      await saveCommercialAssignments(
        currentUser.username,
        assignedClients,
        Array.from(selectedGroupsSet),
        clientGroupMappings
      );

      setCurrentUser(updatedUser);
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updatedUser);
      }

      setSaveSuccessMessage(`Carteira com ${assignedClients.length} empresas salva com sucesso no perfil e na planilha!`);
      setTimeout(() => {
        setSaveSuccessMessage('');
      }, 4000);
    } catch (err) {
      console.error('Erro ao salvar carteira no perfil e planilha:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Extract all unique economic groups from data
  const availableGrupos = useMemo(() => {
    return Array.from(new Set(data.map((w) => w.grupoEconomico).filter(Boolean))).sort();
  }, [data]);

  // Synchronize client assignments locally
  const handleToggleClientAssignment = (clientName: string) => {
    let next: string[];
    if (assignedClients.includes(clientName)) {
      next = assignedClients.filter((c) => c !== clientName);
      saveClientAssignment(clientName, '');
    } else {
      next = [...assignedClients, clientName];
      saveClientAssignment(clientName, currentUser.username);
    }
    setAssignedClients(next);
  };

  // Toggle entire economic group (automatically selects/unselects all clients linked to this group)
  const handleToggleGrupoEconomico = (grupoName: string) => {
    const gLower = grupoName.toLowerCase().trim();
    const clientsInGroup: string[] = Array.from(
      new Set(
        data
          .filter((w) => {
            const grp = w.grupoEconomico.toLowerCase().trim();
            return grp === gLower || grp.includes(gLower) || gLower.includes(grp);
          })
          .map((w) => w.nomeCliente)
          .filter(Boolean)
      )
    );

    if (clientsInGroup.length === 0) return;

    const allSelected = clientsInGroup.every((c) => assignedClients.includes(c));

    let next: string[];
    if (allSelected) {
      next = assignedClients.filter((c) => !clientsInGroup.includes(c));
      clientsInGroup.forEach((c) => saveClientAssignment(c, ''));
    } else {
      next = Array.from(new Set([...assignedClients, ...clientsInGroup]));
      clientsInGroup.forEach((c) => saveClientAssignment(c, currentUser.username));
    }
    setAssignedClients(next);
  };

  // Perform portfolio analysis over selected timeframe (3m, 6m, 9m, 12m)
  const analytics = useMemo(() => {
    return analyzePortfolioForPeriod(data, assignedClients, selectedPeriodMonths);
  }, [data, assignedClients, selectedPeriodMonths]);

  // Portfolio workers subset for charts
  const portfolioWorkers = useMemo(() => {
    if (assignedClients.length === 0) return [];
    return data.filter((w) => {
      const clientMatch = assignedClients.includes(w.nomeCliente);
      const groupMatch = Boolean(w.grupoEconomico && assignedClients.includes(w.grupoEconomico));
      return clientMatch || groupMatch;
    });
  }, [data, assignedClients]);

  // Filtered clients list for assignment search
  const filteredAvailableClientes = useMemo(() => {
    if (!searchTerm.trim()) return availableClientes.slice(0, 40);
    const q = searchTerm.toLowerCase();
    return availableClientes.filter((c) => {
      if (c.toLowerCase().includes(q)) return true;
      const matchWorker = data.find((w) => w.nomeCliente.toLowerCase() === c.toLowerCase());
      return matchWorker && matchWorker.grupoEconomico.toLowerCase().includes(q);
    });
  }, [availableClientes, searchTerm, data]);

  // Filtered grupos list
  const filteredAvailableGrupos = useMemo(() => {
    if (!grupoSearchTerm.trim()) return availableGrupos;
    const q = grupoSearchTerm.toLowerCase();
    return availableGrupos.filter((g) => g.toLowerCase().includes(q));
  }, [availableGrupos, grupoSearchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Banner & Timeframe Selector */}
      <div className="bg-gradient-to-r from-[#401669] via-[#521c87] to-[#1e0735] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-purple-900/30">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-purple-200 border border-white/10">
              <BarChart3 className="w-3.5 h-3.5 text-purple-300" />
              <span>Estudo Estratégico de Carteira Comercial</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Análise da Carteira Comercial
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl leading-relaxed">
              Monitore a atividade e evolução das suas contas, selecione por Grupo Econômico ou Empresas Individuais, identifique clientes sem novas contratações nos últimos meses e ative planos de ação.
            </p>
          </div>

          {/* Timeframe Filter Switcher */}
          <div className="bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 flex items-center gap-1">
            {[
              { label: '3 Meses', months: 3 },
              { label: '6 Meses', months: 6 },
              { label: '9 Meses', months: 9 },
              { label: '1 Ano', months: 12 },
            ].map((item) => (
              <button
                key={item.months}
                onClick={() => setSelectedPeriodMonths(item.months)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedPeriodMonths === item.months
                    ? 'bg-white text-[#401669] shadow-lg font-black scale-105'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Selector Drawer with Grupo Econômico & Client Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isSelectionExpanded ? 'pb-3 border-b border-slate-100' : ''
          }`}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#401669]" />
              Meus Clientes Vinculados à Carteira ({assignedClients.length})
            </h2>
            <p className="text-xs text-slate-500">
              {assignedClients.length === 0
                ? 'Nenhum cliente atrelado à sua carteira. Expanda a área de busca abaixo para selecionar Grupos Econômicos ou Clientes e salvar no seu perfil.'
                : 'Exibindo análises e indicadores focados estritamente nos clientes e grupos vinculados a esta carteira.'}
            </p>
          </div>

          {/* Selector Subtabs, Save Button & Chevron Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Save Portfolio Button */}
            <button
              onClick={handleSavePortfolioToProfile}
              disabled={isSavingProfile}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isDirty
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 ring-2 ring-emerald-400/50'
                  : 'bg-[#401669] hover:bg-[#2d0e4c] text-white'
              }`}
              title="Salvar esta seleção de clientes no perfil do usuário atual"
            >
              {isSavingProfile ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isDirty ? (
                <Save className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              )}
              <span>{isSavingProfile ? 'Salvando...' : isDirty ? 'Salvar no Perfil' : 'Carteira Salva'}</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  if (!isSelectionExpanded) {
                    setIsSelectionExpanded(true);
                    setActiveSelectionTab('grupos');
                  } else if (activeSelectionTab === 'grupos') {
                    setIsSelectionExpanded(false);
                  } else {
                    setActiveSelectionTab('grupos');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelectionExpanded && activeSelectionTab === 'grupos'
                    ? 'bg-[#401669] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Por Grupo Econômico
              </button>
              <button
                onClick={() => {
                  if (!isSelectionExpanded) {
                    setIsSelectionExpanded(true);
                    setActiveSelectionTab('clientes');
                  } else if (activeSelectionTab === 'clientes') {
                    setIsSelectionExpanded(false);
                  } else {
                    setActiveSelectionTab('clientes');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelectionExpanded && activeSelectionTab === 'clientes'
                    ? 'bg-[#401669] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Por Cliente / CNPJ
              </button>
            </div>

            {/* Chevron Button for Toggle */}
            <button
              onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}
              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-[#401669] flex items-center justify-center hover:bg-slate-200 transition-all cursor-pointer shadow-xs"
              title={isSelectionExpanded ? 'Recolher área de seleção' : 'Expandir busca e seleção'}
            >
              {isSelectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Success message banner */}
        {saveSuccessMessage && (
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">Perfil {currentUser.username} atualizado</span>
          </div>
        )}

        {/* Grupo Econômico Search & Selection Box */}
        {isSelectionExpanded && activeSelectionTab === 'grupos' && (
          <div className="space-y-3 bg-purple-50/40 p-4 rounded-xl border border-purple-100 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#401669] flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                Busca &amp; Seleção por Grupo Econômico (Atribuição em Lote)
              </label>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar Grupo Econômico..."
                  value={grupoSearchTerm}
                  onChange={(e) => setGrupoSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff]"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">
              Ao selecionar um Grupo Econômico, todos os CNPJs e empresas ligadas a esse grupo entram automaticamente na sua carteira. Você pode posteriormente desmarcar clientes individuais se gerenciar apenas unidades específicas.
            </p>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pt-1">
              {filteredAvailableGrupos.map((grupo) => {
                const gLower = grupo.toLowerCase().trim();
                const clientsInGroup = Array.from(
                  new Set(
                    data
                      .filter((w) => {
                        const grp = w.grupoEconomico.toLowerCase().trim();
                        return grp === gLower || grp.includes(gLower) || gLower.includes(grp);
                      })
                      .map((w) => w.nomeCliente)
                      .filter(Boolean)
                  )
                );
                const countSelected = clientsInGroup.filter((c) => assignedClients.includes(c)).length;
                const isAllSelected = clientsInGroup.length > 0 && countSelected === clientsInGroup.length;
                const isPartiallySelected = countSelected > 0 && !isAllSelected;

                return (
                  <button
                    key={grupo}
                    onClick={() => handleToggleGrupoEconomico(grupo)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
                      isAllSelected
                        ? 'bg-purple-700 border-purple-700 text-white shadow-xs'
                        : isPartiallySelected
                        ? 'bg-purple-100 border-purple-400 text-purple-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isAllSelected ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : isPartiallySelected ? (
                      <Filter className="w-3.5 h-3.5 text-purple-700" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{grupo}</span>
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                        isAllSelected
                          ? 'bg-purple-900/40 text-purple-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {countSelected}/{clientsInGroup.length} empresas
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Save Bar for Grupos Selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-purple-200/60">
              <span className="text-xs text-slate-700 font-semibold">
                Sua seleção tem <strong className="text-purple-900 font-extrabold">{assignedClients.length} empresas/CNPJs</strong> vinculados à carteira.
              </span>
              <button
                onClick={handleSavePortfolioToProfile}
                disabled={isSavingProfile}
                className={`w-full sm:w-auto px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isDirty
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 ring-2 ring-emerald-400/40'
                    : 'bg-[#401669] hover:bg-[#2d0e4c] text-white'
                }`}
              >
                {isSavingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSavingProfile ? 'Salvando...' : isDirty ? 'Salvar Seleção no Perfil' : 'Carteira Atualizada no Perfil'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Cliente / CNPJ Search & Selection Box */}
        {isSelectionExpanded && activeSelectionTab === 'clientes' && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#401669]" />
                Busca &amp; Seleção de Clientes Individuais
              </label>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar cliente ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
              {filteredAvailableClientes.map((client) => {
                const isSelected = assignedClients.includes(client);
                return (
                  <button
                    key={client}
                    onClick={() => handleToggleClientAssignment(client)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-purple-100 border-[#9c3aff] text-[#401669]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 text-[#401669]" /> : <Plus className="w-3 h-3 text-slate-400" />}
                    <span>{client}</span>
                  </button>
                );
              })}
            </div>

            {/* Save Bar for Clients Selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-700 font-semibold">
                Sua seleção tem <strong className="text-purple-900 font-extrabold">{assignedClients.length} empresas/CNPJs</strong> vinculados à carteira.
              </span>
              <button
                onClick={handleSavePortfolioToProfile}
                disabled={isSavingProfile}
                className={`w-full sm:w-auto px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isDirty
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 ring-2 ring-emerald-400/40'
                    : 'bg-[#401669] hover:bg-[#2d0e4c] text-white'
                }`}
              >
                {isSavingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSavingProfile ? 'Salvando...' : isDirty ? 'Salvar Seleção no Perfil' : 'Carteira Atualizada no Perfil'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Ticket Médio Salarial
            </span>
            <div className="text-xl font-black text-slate-900">
              R$ {analytics.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-semibold text-purple-700">
              Média salarial da carteira
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-[#401669] flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Folha Carteira */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Folha Salarial Total
            </span>
            <div className="text-xl font-black text-slate-900">
              R$ {analytics.totalMonthlyFolha.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] font-semibold text-emerald-700">
              {analytics.activeWorkersCount} profissionais ativos
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Contratações Recentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Novas Alocações ({selectedPeriodMonths}M)
            </span>
            <div className="text-xl font-black text-slate-900">
              {analytics.currentPeriodAdmissions} Alocações
            </div>
            <p className={`text-[11px] font-semibold ${
              analytics.currentPeriodAdmissions >= analytics.previousPeriodAdmissions
                ? 'text-emerald-700'
                : 'text-amber-700'
            }`}>
              Vs {analytics.previousPeriodAdmissions} no período anterior
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Clientes Sem Novos Ativos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Sem Novos Ativos ({selectedPeriodMonths}M)
            </span>
            <div className="text-xl font-black text-rose-600">
              {analytics.clientsWithoutNewActiveInPeriod.length} Clientes
            </div>
            <p className="text-[11px] font-semibold text-rose-700">
              Requerem contato comercial
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Commercial Portfolio Analytics & Contract Migration Charts */}
      <CommercialAnalyticsCharts
        workers={portfolioWorkers}
        title="Estudo de Contratos & Migração de Carteira"
        subtitle="Analise a distribuição de ativos por tipo de vínculo (Temporário x CLT) e acompanhe a evolução temporal de admissões, prorrogações e desligamentos na sua carteira."
      />

      {/* Alerts & Positive Callouts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Alertas de Desengajamento */}
        <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Alertas de Desengajamento</h3>
                <p className="text-xs text-slate-500">Contas sem movimentações recentes ({selectedPeriodMonths} meses)</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-full">
              {analytics.clientsWithoutNewActiveInPeriod.length} Alertas
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {analytics.clientsWithoutNewActiveInPeriod.length === 0 ? (
              <div className="p-4 text-center text-xs text-emerald-800 font-bold bg-emerald-50 rounded-xl border border-emerald-200">
                🎉 Excelente! Todos os seus clientes possuem novas alocações no período selecionado!
              </div>
            ) : (
              analytics.clientsWithoutNewActiveInPeriod.map((item) => (
                <div
                  key={item.clientName}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-amber-400 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {item.clientName}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Última contratação:{' '}
                      <span className="font-semibold text-slate-700">
                        {item.lastAdmissionDate || 'Sem registro'}
                      </span>{' '}
                      {item.daysSinceLastAdmission !== null && `(${item.daysSinceLastAdmission} dias atrás)`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="px-2 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-lg block">
                      0 novas alocações
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {item.activeWorkers} ativos totais
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Destaques Positivos (Positive Reinforcement) */}
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Destaques Positivos &amp; Crescimento</h3>
                <p className="text-xs text-slate-500">Clientes com alto engajamento nos últimos {selectedPeriodMonths} meses</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-extrabold rounded-full">
              Oportunidades
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {analytics.clientStats
              .filter((c) => c.recentAdmissionsCount > 0)
              .slice(0, 6)
              .map((item) => (
                <div
                  key={item.clientName}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-400 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {item.clientName}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Média Salarial:{' '}
                      <span className="font-bold text-slate-800">
                        R$ {item.averageSalary.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </span>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-lg block">
                      +{item.recentAdmissionsCount} novos alocados
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      R$ {item.totalMonthlySalary.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} folha
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

      </div>

      {/* Detailed Portfolio Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Detalhamento Completo da Carteira de Clientes ({analytics.clientStats.length})
            </h3>
            <p className="text-xs text-slate-500">
              Resumo de profissionais ativos, ticket médio e período de inatividade por empresa.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Cliente / Empresa</th>
                <th className="p-3">Grupo Econômico</th>
                <th className="p-3 text-center">Ativos</th>
                <th className="p-3 text-right">Média Salarial</th>
                <th className="p-3 text-center">Contratações ({selectedPeriodMonths}M)</th>
                <th className="p-3">Última Admissão</th>
                <th className="p-3 text-center">Status Recente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium">
              {analytics.clientStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-500 font-medium">
                    <div className="max-w-md mx-auto space-y-2 py-4">
                      <Building2 className="w-8 h-8 text-purple-300 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">Nenhum cliente ou grupo vinculado a esta carteira</p>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        Utilize a área de "Busca &amp; Seleção" acima para adicionar Grupos Econômicos ou Empresas à carteira do usuário <strong className="text-purple-900">{currentUser.username}</strong> e clique no botão <strong className="text-emerald-700">"Salvar no Perfil"</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                analytics.clientStats.map((item) => (
                <tr key={item.clientName} className="hover:bg-purple-50/50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{item.clientName}</div>
                    {item.cnpj && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="font-semibold text-purple-700">CNPJ:</span> {item.cnpj}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {item.grupoEconomico}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-800">
                    {item.activeWorkers}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    R$ {item.averageSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.recentAdmissionsCount > 0
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.recentAdmissionsCount} novas
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {item.lastAdmissionDate || 'Sem registro'}
                  </td>
                  <td className="p-3 text-center">
                    {item.recentAdmissionsCount > 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                        Ativo &amp; Engajado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold">
                        Atenção Necessária
                      </span>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
