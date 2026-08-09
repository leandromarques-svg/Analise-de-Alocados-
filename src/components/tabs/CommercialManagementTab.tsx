import React, { useState, useMemo } from 'react';
import { Funcionario, User } from '../../types';
import {
  getClientInactivityList,
  saveClientAssignment,
  getClientAssignments,
  syncCommercialAssignmentsServer,
} from '../../utils/commercialUtils';
import { getUsers, addUserLog, saveCommercialAssignments, saveUser } from '../../services/userService';
import { CommercialAnalyticsCharts } from '../CommercialAnalyticsCharts';
import { TeamProductivityCharts } from '../TeamProductivityCharts';
import { ExecutiveReportModal } from '../ExecutiveReportModal';
import {
  UserCheck,
  Building2,
  Users,
  Award,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Briefcase,
  UserPlus,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface CommercialManagementTabProps {
  data: Funcionario[];
  currentUser: User;
  onRefreshUsers?: () => void;
}

export const CommercialManagementTab: React.FC<CommercialManagementTabProps> = ({
  data,
  currentUser,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>(() => getClientAssignments());
  const [msg, setMsg] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [selectedAnalyticsRep, setSelectedAnalyticsRep] = useState<string>('all');
  const [onlyInactiveOver1Year, setOnlyInactiveOver1Year] = useState<boolean>(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [grupoSearchTerm, setGrupoSearchTerm] = useState('');

  // Sync assignments with server on load
  const handleServerSync = async () => {
    setIsSyncingServer(true);
    try {
      const synced = await syncCommercialAssignmentsServer();
      setAssignments({ ...synced });
      setMsg('Atribuições de carteira sincronizadas com a planilha e banco de dados do servidor!');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingServer(false);
    }
  };

  // Load commercial users list
  const loadCommercialUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const list = await getUsers();
      setUsers(list);
      await handleServerSync();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  React.useEffect(() => {
    loadCommercialUsers();
  }, []);

  // Commercial reps list
  const commercialReps = useMemo(() => {
    return users.filter((u) => u.role === 'Comercial' || u.role === 'Gerencial Comercial');
  }, [users]);

  // Full inactivity client list
  const clientList = useMemo(() => {
    return getClientInactivityList(data, 12);
  }, [data]);

  // Handle reassigning a client to a commercial rep
  const handleAssignRep = async (clientName: string, repUsername: string) => {
    const previousRepUsername = assignments[clientName];

    const updatedAssignments = saveClientAssignment(clientName, repUsername);
    setAssignments({ ...updatedAssignments });

    // Helper to sync all assignments for a given commercial rep
    const syncRepAssignments = async (repName: string) => {
      if (!repName) return;

      const repClients = Object.entries(updatedAssignments)
        .filter(([_, r]) => r === repName)
        .map(([cli]) => cli);

      const repMappings: Record<string, string> = {};
      const repGroupsSet = new Set<string>();

      repClients.forEach((cli) => {
        const match = clientList.find((c) => c.clientName === cli);
        if (match && match.grupoEconomico) {
          const gLower = match.grupoEconomico.toLowerCase().trim();
          if (gLower !== 'outros' && gLower !== 'sem grupo') {
            repMappings[cli] = match.grupoEconomico;
            repGroupsSet.add(match.grupoEconomico);
          } else {
            repMappings[cli] = '';
          }
        } else {
          repMappings[cli] = '';
        }
      });

      const repGroups = Array.from(repGroupsSet);

      // Save to server & Google Sheets "Atendimento Comercial"
      await saveCommercialAssignments(
        repName,
        repClients,
        repGroups,
        repMappings
      );

      // Update user profile in user DB
      const repUser = commercialReps.find((r) => r.username === repName);
      if (repUser) {
        const updatedUser = {
          ...repUser,
          clientesAtribuidos: repClients,
          gruposEconomicos: repGroups,
        };
        await saveUser(updatedUser);
      }
    };

    if (repUsername) {
      const matched = clientList.find((c) => c.clientName === clientName);
      setMsg(`Cliente "${clientName}" atribuído ao comercial "${repUsername}" com sucesso e salvo na planilha de Atendimento Comercial!`);

      await syncRepAssignments(repUsername);

      // Add audit log directly to user profile
      await addUserLog(
        repUsername,
        currentUser.username,
        'Atribuição de Conta Comercial',
        `Cliente "${clientName}" (CNPJ: ${matched?.cnpj || 'N/A'}) atribuído à carteira por ${currentUser.username}.`
      );
    } else {
      setMsg(`Cliente "${clientName}" desatribuído da carteira.`);
    }

    if (previousRepUsername && previousRepUsername !== repUsername) {
      await syncRepAssignments(previousRepUsername);
    }

    setTimeout(() => setMsg(''), 4000);
  };

  // Team summary comparison table
  const teamPerformance = useMemo(() => {
    const repStats = commercialReps.map((rep) => {
      // Find assigned clients for rep
      const assigned = clientList.filter((c) => {
        const directAssign = assignments[c.clientName] === rep.username;
        const profileAssign = rep.clientesAtribuidos?.includes(c.clientName);
        return directAssign || profileAssign;
      });

      const totalActiveWorkers = assigned.reduce((sum, c) => sum + c.activeWorkers, 0);
      const totalFolha = assigned.reduce((sum, c) => sum + c.totalMonthlySalary, 0);
      const avgTicket = totalActiveWorkers > 0 ? totalFolha / totalActiveWorkers : 0;
      const inactiveAccounts = assigned.filter((c) => c.isInactiveOver1Year).length;

      return {
        rep,
        assignedClientsCount: assigned.length,
        totalActiveWorkers,
        totalFolha,
        avgTicket,
        inactiveAccounts,
      };
    });

    return repStats.sort((a, b) => b.totalFolha - a.totalFolha);
  }, [commercialReps, clientList, assignments]);

  // Selected workers subset for commercial analytics charts
  const selectedAnalyticsWorkers = useMemo(() => {
    if (selectedAnalyticsRep === 'all') {
      return data;
    }
    const rep = commercialReps.find((r) => r.username === selectedAnalyticsRep);
    if (!rep) return [];

    const assigned = clientList.filter((c) => {
      const directAssign = assignments[c.clientName] === rep.username;
      const profileAssign = rep.clientesAtribuidos?.includes(c.clientName);
      return directAssign || profileAssign;
    });
    const assignedNames = new Set(assigned.map((a) => a.clientName));
    const assignedGroups = new Set(rep.gruposEconomicos || []);

    return data.filter(
      (w) =>
        assignedNames.has(w.nomeCliente) ||
        (w.grupoEconomico && assignedGroups.has(w.grupoEconomico))
    );
  }, [data, selectedAnalyticsRep, commercialReps, clientList, assignments]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clientList.filter((c) => {
      if (onlyInactiveOver1Year && !c.isInactiveOver1Year) return false;

      const assignedRepName = assignments[c.clientName] || '';
      if (selectedRepFilter === 'unassigned' && assignedRepName !== '') return false;
      if (
        selectedRepFilter !== 'all' &&
        selectedRepFilter !== 'unassigned' &&
        assignedRepName.toLowerCase() !== selectedRepFilter.toLowerCase()
      ) {
        return false;
      }

      // Filter by Client or CNPJ
      if (clientSearchTerm.trim()) {
        const q = clientSearchTerm.toLowerCase().trim();
        const matchesName = c.clientName.toLowerCase().includes(q);
        const matchesCnpj = c.cnpj.toLowerCase().includes(q);
        if (!matchesName && !matchesCnpj) return false;
      }

      // Filter by Grupo Economico
      if (grupoSearchTerm.trim()) {
        const q = grupoSearchTerm.toLowerCase().trim();
        const matchesGroup = c.grupoEconomico.toLowerCase().includes(q);
        if (!matchesGroup) return false;
      }

      return true;
    });
  }, [
    clientList,
    onlyInactiveOver1Year,
    selectedRepFilter,
    clientSearchTerm,
    grupoSearchTerm,
    assignments,
  ]);

  // Total unassigned clients
  const unassignedCount = useMemo(() => {
    return clientList.filter((c) => !assignments[c.clientName]).length;
  }, [clientList, assignments]);

  // Total inactive accounts (> 1 year)
  const totalInactiveCount = useMemo(() => {
    return clientList.filter((c) => c.isInactiveOver1Year).length;
  }, [clientList]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Head Comercial Header */}
      <div className="bg-gradient-to-r from-[#1e0735] via-[#401669] to-[#521c87] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-purple-900/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-purple-200 border border-white/10">
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              <span>Painel do Head Comercial</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestão da Equipe Comercial & Atribuição de Contas
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl leading-relaxed">
              Acompanhe a performance do time comercial, identifique clientes inativos há mais de 1 ano,
              e atribua contas sem proprietário diretamente para os executivos de vendas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/40"
              title="Gerar Relatório Executivo em alta definição para a Sócia Proprietária Dona Biga"
            >
              <FileText className="w-4 h-4 text-emerald-100" />
              <span>Relatório Executivo PDF (Dona Biga)</span>
            </button>

            <button
              onClick={handleServerSync}
              disabled={isSyncingServer}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Sincronizar a planilha de carteira com o servidor de banco de dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-200 ${isSyncingServer ? 'animate-spin' : ''}`} />
              <span>Sincronizar Carteira</span>
            </button>

            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-center min-w-[110px]">
              <span className="text-xl font-black block">{unassignedCount}</span>
              <span className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">Sem Proprietário</span>
            </div>
            <div className="bg-rose-500/20 p-3 rounded-2xl backdrop-blur-md border border-rose-400/30 text-center min-w-[110px]">
              <span className="text-xl font-black text-rose-200 block">{totalInactiveCount}</span>
              <span className="text-[10px] text-rose-200 uppercase font-bold tracking-wider">Inativos &gt; 1 Ano</span>
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Commercial Reps Performance Comparison */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#401669]" />
              Desempenho & Produtividade Comparativa da Equipe Comercial ({teamPerformance.length})
            </h2>
            <p className="text-xs text-slate-500">
              Analise a cobertura de carteiras, folha gerida, ticket médio e identificação de clientes inativos por executivo de vendas.
            </p>
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#401669] font-bold text-xs rounded-xl border border-purple-200 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#9c3aff]" />
            <span>Ver Visão de Diretoria (Dona Biga)</span>
          </button>
        </div>

        {/* Productivity Comparison Charts */}
        <TeamProductivityCharts teamStats={teamPerformance} />

        {/* Comparative Summary Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-[#401669]" />
            Tabela Detalhada de Cobertura por Comercial
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Executivo Comercial</th>
                  <th className="p-3">Cargo / Perfil</th>
                  <th className="p-3 text-center">Clientes Atribuídos</th>
                  <th className="p-3 text-center">Ativos Geridos</th>
                  <th className="p-3 text-right">Folha Mensal Gerida</th>
                  <th className="p-3 text-right">Ticket Médio</th>
                  <th className="p-3 text-center">Inativos (&gt; 1 Ano)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {teamPerformance.map((item) => (
                  <tr key={item.rep.username} className="hover:bg-purple-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-purple-100 text-[#401669] flex items-center justify-center text-xs font-black">
                        {item.rep.username.substring(0, 2).toUpperCase()}
                      </span>
                      {item.rep.username}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-purple-100 text-[#401669] text-[10px] font-bold rounded-full">
                        {item.rep.role}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-900">
                      {item.assignedClientsCount} empresas
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-800">
                      {item.totalActiveWorkers} alocados
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      R$ {item.totalFolha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700">
                      R$ {item.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      {item.inactiveAccounts > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-lg text-[10px]">
                          {item.inactiveAccounts} contas inativas
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px]">
                          0 inativas
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Commercial Rep Analytics Selector & Contract Migration Charts */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#401669]" />
              Análise de Contratos e Evolução de Carteira por Comercial
            </h2>
            <p className="text-xs text-slate-500">
              Selecione um executivo comercial para estudar a distribuição de contratos (CLT x Temporário) e a evolução de admissões, prorrogações e saídas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Filtrar Carteira:</span>
            <select
              value={selectedAnalyticsRep}
              onChange={(e) => setSelectedAnalyticsRep(e.target.value)}
              className="px-3 py-1.5 text-xs bg-purple-50 border border-purple-200 rounded-xl text-[#401669] font-bold focus:outline-none focus:ring-2 focus:ring-[#9c3aff]"
            >
              <option value="all">Toda a Equipe Comercial (Visão Geral)</option>
              {commercialReps.map((r) => (
                <option key={r.username} value={r.username}>
                  Executivo: {r.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CommercialAnalyticsCharts
          workers={selectedAnalyticsWorkers}
          title={
            selectedAnalyticsRep === 'all'
              ? 'Análise Consolidada da Equipe Comercial'
              : `Análise da Carteira de ${selectedAnalyticsRep}`
          }
          subtitle={`Acompanhamento de alocados por tipo de vínculo e evolução temporal de movimentações para a carteira de ${
            selectedAnalyticsRep === 'all' ? 'toda a equipe' : selectedAnalyticsRep
          }.`}
        />
      </div>

      {/* Account Assignment & Inactivity Management Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Filter Controls Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#401669]" />
              Gestão e Distribuição da Base de Clientes ({filteredClients.length})
            </h2>
            <p className="text-xs text-slate-500">
              Filtre por Cliente/CNPJ ou por Grupo Econômico, identifique empresas inativas há mais de 1 ano ou sem proprietário e atribua um comercial dedicado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Client / CNPJ */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por Cliente ou CNPJ..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] min-w-[190px]"
              />
            </div>

            {/* Filter by Grupo Econômico */}
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por Grupo Econômico..."
                value={grupoSearchTerm}
                onChange={(e) => setGrupoSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] min-w-[190px]"
              />
            </div>

            {/* Rep Filter Dropdown */}
            <select
              value={selectedRepFilter}
              onChange={(e) => setSelectedRepFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#9c3aff]"
            >
              <option value="all">Todos os Comerciais</option>
              <option value="unassigned">Apenas sem comercial atribuído ({unassignedCount})</option>
              {commercialReps.map((r) => (
                <option key={r.username} value={r.username}>
                  Executivo: {r.username}
                </option>
              ))}
            </select>

            {/* Toggle Only Inactive > 1 Year */}
            <button
              type="button"
              onClick={() => setOnlyInactiveOver1Year(!onlyInactiveOver1Year)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
                onlyInactiveOver1Year
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Sem Novas Solicitações &gt; 1 Ano</span>
            </button>
          </div>
        </div>

        {/* Clients Assignment Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Cliente / Razão Social &amp; CNPJ</th>
                <th className="p-3">Grupo Econômico</th>
                <th className="p-3 text-center">Ativos Totais</th>
                <th className="p-3">Última Admissão</th>
                <th className="p-3 text-center">Status de Atividade</th>
                <th className="p-3">Comercial Atribuído</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium">
              {filteredClients.map((client) => {
                const assignedRep = assignments[client.clientName] || '';
                const isGestorOrAdmin =
                  currentUser.role === 'Gerencial Comercial' ||
                  currentUser.role === 'Administrador' ||
                  currentUser.role === 'RH';
                const isAssignedToOther = Boolean(assignedRep && assignedRep !== currentUser.username);

                return (
                  <tr key={client.clientName} className="hover:bg-purple-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{client.clientName}</div>
                      {client.cnpj && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="font-semibold text-purple-700">CNPJ:</span> {client.cnpj}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {client.grupoEconomico}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {client.activeWorkers}
                    </td>
                    <td className="p-3 text-slate-600">
                      {client.lastAdmissionDate || 'Sem registro'}
                      {client.daysSinceLastAdmission !== null && (
                        <span className="block text-[10px] text-slate-400">
                          {client.daysSinceLastAdmission} dias atrás
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {client.isInactiveOver1Year ? (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Sem Novas Solicitações (&gt; 1 Ano)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-bold">
                          Ativo Recente
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {isAssignedToOther && !isGestorOrAdmin ? (
                        <div className="px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-slate-100 text-slate-500 border-slate-200 flex items-center justify-between gap-1 shadow-xs" title="Apenas o gestor comercial pode alterar um cliente já atribuído a outro executivo.">
                          <span className="truncate">Atribuído: <strong className="text-purple-900">{assignedRep}</strong></span>
                          <Shield className="w-3.5 h-3.5 text-purple-700 flex-shrink-0" />
                        </div>
                      ) : (
                        <select
                          value={assignedRep}
                          onChange={(e) => handleAssignRep(client.clientName, e.target.value)}
                          className={`w-full px-2.5 py-1 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#9c3aff] transition-all cursor-pointer ${
                            assignedRep
                              ? 'bg-purple-50 text-[#401669] border-purple-200'
                              : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                          }`}
                        >
                          <option value="">-- Sem Proprietário --</option>
                          {isGestorOrAdmin
                            ? commercialReps.map((r) => (
                                <option key={r.username} value={r.username}>
                                  Atribuir para: {r.username}
                                </option>
                              ))
                            : (
                              <option value={currentUser.username}>
                                Atribuir para mim ({currentUser.username})
                              </option>
                            )
                          }
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Executive PDF Report Modal for Dona Biga */}
      <ExecutiveReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        workers={data}
        commercialReps={commercialReps}
        currentUser={currentUser}
      />

    </div>
  );
};
