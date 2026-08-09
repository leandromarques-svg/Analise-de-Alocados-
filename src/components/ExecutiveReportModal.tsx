import React from 'react';
import { Funcionario, User } from '../types';
import { getClientInactivityList, getClientAssignments, formatDateDDMMAAAA } from '../utils/commercialUtils';
import { Printer, X, Shield, Users, Briefcase, DollarSign, AlertTriangle, TrendingUp, Award, CheckCircle2, FileText, Download } from 'lucide-react';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: Funcionario[];
  commercialReps: User[];
  currentUser: User;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  workers,
  commercialReps,
  currentUser,
}) => {
  if (!isOpen) return null;

  const assignments = getClientAssignments();
  const clientList = getClientInactivityList(workers, 12);

  // Overall metrics
  const activeWorkers = workers.filter((w) => w.isAtivo);
  const totalActiveHeadcount = activeWorkers.length;
  const totalMonthlyFolha = activeWorkers.reduce((sum, w) => sum + (w.salario || 0), 0);
  const totalClientsCount = new Set(workers.map((w) => w.nomeCliente).filter(Boolean)).size;
  const unassignedClientsCount = clientList.filter((c) => !assignments[c.clientName]).length;
  const inactiveClientsOver1Year = clientList.filter((c) => c.isInactiveOver1Year);

  // Per-rep team performance breakdown
  const teamStats = commercialReps.map((rep) => {
    const repClients = clientList.filter((c) => {
      const direct = assignments[c.clientName] === rep.username;
      const profile = rep.clientesAtribuidos?.includes(c.clientName);
      return direct || profile;
    });

    const activeCount = repClients.reduce((sum, c) => sum + c.activeWorkers, 0);
    const folhaSum = repClients.reduce((sum, c) => sum + c.totalMonthlySalary, 0);
    const ticket = activeCount > 0 ? folhaSum / activeCount : 0;
    const inactiveCount = repClients.filter((c) => c.isInactiveOver1Year).length;

    return {
      repName: rep.username,
      role: rep.role,
      assignedClientsCount: repClients.length,
      activeCount,
      folhaSum,
      ticket,
      inactiveCount,
    };
  }).sort((a, b) => b.folhaSum - a.folhaSum);

  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = formatDateDDMMAAAA(new Date().toISOString());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12pt !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print-container my-6">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-[#1e0735] text-white p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-200 font-bold">
              <FileText className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">Relatório Executivo Comercial</h2>
              <p className="text-xs text-purple-200">
                Visualização formatada com letras ampliadas e alto contraste para apresentação à Diretoria (Dona Biga).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Document Body */}
        <div className="p-6 sm:p-10 space-y-8 bg-white text-slate-900 font-sans leading-relaxed">
          
          {/* Document Header */}
          <div className="border-b-4 border-[#401669] pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-[#401669] tracking-widest uppercase mb-1">
                <Shield className="w-4 h-4 text-[#9c3aff]" />
                <span>MetaRH — Gestão Estratégica de Carteira</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                RELATÓRIO EXECUTIVO DE CARTEIRA COMERCIAL
              </h1>
              <p className="text-base font-bold text-purple-950 mt-1">
                Apresentação à Sócia-Proprietária: <strong className="text-[#401669]">Dona Biga</strong>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs font-bold text-slate-700 bg-purple-50 p-3.5 rounded-2xl border border-purple-100 min-w-[200px]">
              <div>Data de Emissão: <strong className="text-slate-900">{currentDateFormatted}</strong></div>
              <div>Gerado por: <strong className="text-slate-900">{currentUser.username} ({currentUser.role})</strong></div>
              <div>Base de Dados: <strong className="text-purple-900">18.000+ Históricos Ativos</strong></div>
            </div>
          </div>

          {/* Resumo Executivo Highlight Box */}
          <div className="bg-purple-50/80 p-6 rounded-3xl border-2 border-purple-200 space-y-3">
            <h2 className="text-lg font-black text-[#401669] flex items-center gap-2 uppercase tracking-wide">
              <Award className="w-6 h-6 text-[#9c3aff]" />
              Resumo Executivo para a Diretoria
            </h2>
            <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
              Este relatório apresenta a posição consolidada da carteira comercial da MetaRH. Atualmente, a empresa gerencia{' '}
              <strong className="text-purple-950 font-black">{totalActiveHeadcount.toLocaleString('pt-BR')} colaboradores alocados ativos</strong>,
              representando um volume total de folha mensal de{' '}
              <strong className="text-emerald-950 font-black">
                R$ {totalMonthlyFolha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>{' '}
              distribuídos em <strong className="text-purple-950 font-black">{totalClientsCount} empresas contratantes</strong>.
            </p>
          </div>

          {/* Key Metric Cards Grid (Large High-Contrast Numbers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-300 text-slate-900 space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">Trabalhadores Ativos</span>
              <span className="text-3xl font-black text-slate-900 block">{totalActiveHeadcount.toLocaleString('pt-BR')}</span>
              <span className="text-xs font-bold text-slate-600 block">Colaboradores em operação</span>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">Folha Mensal Total</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-950 block">
                R$ {totalMonthlyFolha.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-bold text-emerald-800 block">Massa salarial administrada</span>
            </div>

            <div className="p-5 rounded-2xl bg-purple-50 border-2 border-purple-300 text-purple-950 space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#401669] block">Base de Clientes</span>
              <span className="text-3xl font-black text-[#401669] block">{totalClientsCount}</span>
              <span className="text-xs font-bold text-purple-800 block">Empresas cadastradas</span>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 block">Contas sem Responsável</span>
              <span className="text-3xl font-black text-amber-950 block">{unassignedClientsCount}</span>
              <span className="text-xs font-bold text-amber-800 block">Aguardando atribuição</span>
            </div>

          </div>

          {/* Team Performance Table Section */}
          <div className="space-y-4">
            <div className="border-b-2 border-slate-200 pb-2">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-[#401669]" />
                1. Desempenho e Produtividade por Executivo Comercial
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                Acompanhamento detalhado do volume de contas, colaboradores alocados e massa salarial sob responsabilidade de cada comercial.
              </p>
            </div>

            <div className="border-2 border-slate-300 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#1e0735] text-white uppercase text-xs font-black tracking-wider">
                  <tr>
                    <th className="p-3.5 border-b border-purple-900">Executivo Comercial</th>
                    <th className="p-3.5 text-center border-b border-purple-900">Clientes Atribuídos</th>
                    <th className="p-3.5 text-center border-b border-purple-900">Alocados Ativos</th>
                    <th className="p-3.5 text-right border-b border-purple-900">Folha Gerida (R$)</th>
                    <th className="p-3.5 text-right border-b border-purple-900">Ticket Médio (R$)</th>
                    <th className="p-3.5 text-center border-b border-purple-900">Inativos (&gt;1 Ano)</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 font-bold text-slate-900 bg-white">
                  {teamStats.map((item) => (
                    <tr key={item.repName} className="hover:bg-purple-50/50">
                      <td className="p-3.5 font-black text-base text-slate-900">
                        {item.repName} <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full ml-1">{item.role}</span>
                      </td>
                      <td className="p-3.5 text-center text-slate-900 text-base">
                        {item.assignedClientsCount} empresas
                      </td>
                      <td className="p-3.5 text-center text-emerald-900 text-base font-black">
                        {item.activeCount} alocados
                      </td>
                      <td className="p-3.5 text-right text-slate-900 text-base font-black">
                        R$ {item.folhaSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-slate-800 text-base">
                        R$ {item.ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        {item.inactiveCount > 0 ? (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-950 font-black rounded-lg text-xs border border-rose-300">
                            {item.inactiveCount} inativas
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 font-black rounded-lg text-xs border border-emerald-300">
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

          {/* Inactive Accounts Alert Section */}
          <div className="space-y-4">
            <div className="border-b-2 border-slate-200 pb-2">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
                2. Alerta de Desengajamento: Clientes Inativos há mais de 1 Ano
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                Empresas sem novas admissões registrados nos últimos 12 meses. Oportunidade prioritária de reaproximação comercial.
              </p>
            </div>

            {inactiveClientsOver1Year.length > 0 ? (
              <div className="border-2 border-rose-200 rounded-2xl overflow-hidden bg-rose-50/40">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-rose-900 text-white uppercase text-xs font-black">
                    <tr>
                      <th className="p-3.5">Nome do Cliente</th>
                      <th className="p-3.5">Grupo Econômico</th>
                      <th className="p-3.5 text-center">Admissão Mais Recente</th>
                      <th className="p-3.5 text-center">Alocados Ativos</th>
                      <th className="p-3.5 text-center">Comercial Atribuído</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200 font-bold text-slate-900">
                    {inactiveClientsOver1Year.slice(0, 10).map((client) => (
                      <tr key={client.clientName} className="hover:bg-rose-100/50">
                        <td className="p-3 font-black text-slate-900">{client.clientName}</td>
                        <td className="p-3 text-slate-700">{client.grupoEconomico || 'Sem Grupo'}</td>
                        <td className="p-3 text-center font-bold text-rose-900">{client.lastAdmissionDate || 'Sem registro'}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{client.activeWorkers}</td>
                        <td className="p-3 text-center">
                          {client.assignedRep ? (
                            <span className="px-2.5 py-0.5 bg-purple-100 text-[#401669] font-black rounded-lg text-xs">
                              {client.assignedRep}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 font-black rounded-lg text-xs">
                              Sem Proprietário
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Excelente! Não existem empresas ativas com mais de 1 ano sem novas admissões.</span>
              </div>
            )}
          </div>

          {/* Strategic Action Plan for Board */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 border-2 border-slate-800">
            <h2 className="text-xl font-black text-purple-300 flex items-center gap-2 uppercase tracking-wide">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              3. Plano de Ação Estratégico & Recomendações Comercial
            </h2>
            <ul className="space-y-3 text-sm sm:text-base font-semibold text-slate-200">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Atribuição de Contas Órfãs:</strong> Existem{' '}
                  <strong className="text-amber-300 font-black">{unassignedClientsCount} empresas</strong> sem um executivo responsável. Recomendamos a imediata distribuição entre os comerciais.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Campanha de Reengajamento Comercial:</strong> Priorizar visitas e apresentação de novas soluções de RH para as empresas com mais de 365 dias sem contratações.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Migração de Contratos Temporários x CLT:</strong> Aproveitar os contratos temporários próximos do vencimento para oferecer soluções de recrutamento efetivo ou terceirização continuada.
                </span>
              </li>
            </ul>
          </div>

          {/* Document Footer */}
          <div className="border-t-2 border-slate-300 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-slate-500 gap-2">
            <div>MetaRH Inteligência Comercial — Documento Interno de Alta Administração</div>
            <div>Página 1 de 1</div>
          </div>

        </div>

      </div>
    </div>
  );
};
