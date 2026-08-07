import React, { useState, useMemo } from 'react';
import { Funcionario, User } from '../../types';
import {
  getClientInactivityList,
  saveClientAssignment,
  getClientAssignments,
} from '../../utils/commercialUtils';
import { getUsers, addUserLog } from '../../services/userService';
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
  const [assignments, setAssignments] = useState<Record<string, string>>(() => getClientAssignments());
  const [msg, setMsg] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [onlyInactiveOver1Year, setOnlyInactiveOver1Year] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load commercial users list
  const loadCommercialUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const list = await getUsers();
      setUsers(list);
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
    const updatedAssignments = saveClientAssignment(clientName, repUsername);
    setAssignments({ ...updatedAssignments });

    if (repUsername) {
      setMsg(`Cliente "${clientName}" atribuído ao comercial "${repUsername}" com sucesso!`);
      // Add audit log directly to user profile
      await addUserLog(
        repUsername,
        currentUser.username,
        'Atribuição de Conta Comercial',
        `Cliente "${clientName}" atribuído à carteira por ${currentUser.username}.`
      );
    } else {
      setMsg(`Cliente "${clientName}" desatribuído da carteira.`);
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

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          c.clientName.toLowerCase().includes(q) ||
          c.grupoEconomico.toLowerCase().includes(q) ||
          c.cnpj.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [clientList, onlyInactiveOver1Year, selectedRepFilter, searchTerm, assignments]);

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
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-center min-w-[120px]">
              <span className="text-xl font-black block">{unassignedCount}</span>
              <span className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">Sem Proprietário</span>
            </div>
            <div className="bg-rose-500/20 p-3 rounded-2xl backdrop-blur-md border border-rose-400/30 text-center min-w-[120px]">
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#401669]" />
              Desempenho Comparativo da Equipe Comercial ({teamPerformance.length})
            </h2>
            <p className="text-xs text-slate-500">
              Analise a cobertura de carteiras, folha gerida e identificação de clientes inativos por executivo.
            </p>
          </div>
        </div>

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

      {/* Account Assignment & Inactivity Management Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Filter Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#401669]" />
              Gestão e Distribuição da Base de Clientes ({filteredClients.length})
            </h2>
            <p className="text-xs text-slate-500">
              Filtre empresas inativas há mais de 1 ano ou sem proprietário e atribua um comercial dedicado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cliente ou grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff]"
              />
            </div>

            {/* Rep Filter Dropdown */}
            <select
              value={selectedRepFilter}
              onChange={(e) => setSelectedRepFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#9c3aff]"
            >
              <option value="all">Todos os Comerciais</option>
              <option value="unassigned">Sem Proprietário ({unassignedCount})</option>
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
              <span>Somente Inativos &gt; 1 Ano</span>
            </button>
          </div>
        </div>

        {/* Clients Assignment Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Cliente / Razão Social</th>
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
                return (
                  <tr key={client.clientName} className="hover:bg-purple-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      {client.clientName}
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
                          Inativo (&gt; 1 Ano)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-bold">
                          Ativo Recente
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <select
                        value={assignedRep}
                        onChange={(e) => handleAssignRep(client.clientName, e.target.value)}
                        className={`w-full px-2.5 py-1 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#9c3aff] transition-all ${
                          assignedRep
                            ? 'bg-purple-50 text-[#401669] border-purple-200'
                            : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                        }`}
                      >
                        <option value="">-- Sem Proprietário --</option>
                        {commercialReps.map((r) => (
                          <option key={r.username} value={r.username}>
                            Atribuir para: {r.username}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
