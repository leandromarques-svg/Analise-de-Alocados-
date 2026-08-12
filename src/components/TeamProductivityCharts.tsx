import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { Users, DollarSign, TrendingUp, AlertTriangle, Award, Shield, Briefcase } from 'lucide-react';
import { User } from '../types';

export interface RepPerformanceStat {
  rep: User;
  assignedClientsCount: number;
  totalActiveWorkers: number;
  totalFolha: number;
  avgTicket: number;
  inactiveAccounts: number;
}

interface TeamProductivityChartsProps {
  teamStats: RepPerformanceStat[];
}

const PURPLE_GRADIENTS = ['#401669', '#6b21a8', '#9c3aff', '#c084fc', '#e9d5ff'];

export const TeamProductivityCharts: React.FC<TeamProductivityChartsProps> = ({ teamStats }) => {
  // Chart 1: Headcount & Clients Data
  const headcountChartData = useMemo(() => {
    return teamStats.map((item) => ({
      name: item.rep?.username || 'Desconhecido',
      'Alocados Ativos': item.totalActiveWorkers,
      'Clientes Atribuídos': item.assignedClientsCount,
    }));
  }, [teamStats]);

  // Chart 2: Folha de Pagamento Total Gerida
  const folhaChartData = useMemo(() => {
    return teamStats.map((item) => ({
      name: item.rep?.username || 'Desconhecido',
      'Folha Gerida (R$)': item.totalFolha,
    }));
  }, [teamStats]);

  // Chart 3: Ticket Médio por Trabalhador
  const ticketChartData = useMemo(() => {
    return teamStats.map((item) => ({
      name: item.rep?.username || 'Desconhecido',
      'Ticket Médio (R$)': Math.round(item.avgTicket),
    }));
  }, [teamStats]);

  // Chart 4: Inatividade vs Ativas
  const inactivityChartData = useMemo(() => {
    return teamStats.map((item) => ({
      name: item.rep?.username || 'Desconhecido',
      'Contas Ativas': item.assignedClientsCount - item.inactiveAccounts,
      'Inativas > 1 Ano': item.inactiveAccounts,
    }));
  }, [teamStats]);

  // Highlights
  const topFolhaRep = useMemo(() => {
    if (teamStats.length === 0) return null;
    return [...teamStats].sort((a, b) => b.totalFolha - a.totalFolha)[0];
  }, [teamStats]);

  const topHeadcountRep = useMemo(() => {
    if (teamStats.length === 0) return null;
    return [...teamStats].sort((a, b) => b.totalActiveWorkers - a.totalActiveWorkers)[0];
  }, [teamStats]);

  if (teamStats.length === 0) return null;

  return (
    <div className="space-y-6">
      
      {/* Productivity Highlight Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topFolhaRep && (
          <div className="bg-gradient-to-br from-purple-900 to-[#1e0735] text-white p-4 rounded-2xl border border-purple-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-200 flex-shrink-0">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-300 block">Líder em Volume de Folha</span>
              <span className="text-base font-black text-white">{topFolhaRep.rep?.username || 'Desconhecido'}</span>
              <span className="text-xs font-bold text-emerald-300 block">
                R$ {topFolhaRep.totalFolha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {topHeadcountRep && (
          <div className="bg-gradient-to-br from-purple-900 to-[#1e0735] text-white p-4 rounded-2xl border border-purple-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-200 flex-shrink-0">
              <Users className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-300 block">Maior Volume de Alocados</span>
              <span className="text-base font-black text-white">{topHeadcountRep.rep?.username || 'Desconhecido'}</span>
              <span className="text-xs font-bold text-purple-200 block">
                {topHeadcountRep.totalActiveWorkers} trabalhadores ativos ({topHeadcountRep.assignedClientsCount} empresas)
              </span>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-purple-900 to-[#1e0735] text-white p-4 rounded-2xl border border-purple-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-200 flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-purple-300 block">Média por Executivo</span>
            <span className="text-base font-black text-white">
              {Math.round(teamStats.reduce((s, i) => s + i.totalActiveWorkers, 0) / teamStats.length)} Alocados
            </span>
            <span className="text-xs font-bold text-purple-200 block">
              Ticket Médio Global: R${' '}
              {Math.round(
                teamStats.reduce((s, i) => s + i.avgTicket, 0) / teamStats.length
              ).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of 4 Productivity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Volume de Alocados Ativos vs Clientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#401669]" />
                Volume de Alocados Ativos x Clientes
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Comparativo de total de trabalhadores e número de empresas geridas</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  labelStyle={{ color: '#ffffff', fontWeight: '800', borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="Alocados Ativos" fill="#9c3aff" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Clientes Atribuídos" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Folha Mensal Gerida por Comercial */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Folha Mensal Gerida por Executivo (R$)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Volume financeiro de folha de pagamento administrada por carteira</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={folhaChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Folha Gerida']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)' }}
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                  labelStyle={{ color: '#ffffff', fontWeight: '800', borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px' }}
                />
                <Bar dataKey="Folha Gerida (R$)" radius={[6, 6, 0, 0]}>
                  {folhaChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PURPLE_GRADIENTS[index % PURPLE_GRADIENTS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Ticket Médio por Trabalhador */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-700" />
                Ticket Médio por Alocado (R$)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Salário médio por colaborador nas empresas atendidas por comercial</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Ticket Médio']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)' }}
                  itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                  labelStyle={{ color: '#ffffff', fontWeight: '800', borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px' }}
                />
                <Bar dataKey="Ticket Médio (R$)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Cobertura de Risco (Contas Ativas vs Inativas > 1 Ano) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Status de Engajamento da Carteira
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Proporção de clientes com novas admissões vs inativos há mais de 1 ano</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inactivityChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  labelStyle={{ color: '#ffffff', fontWeight: '800', borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="Contas Ativas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Inativas > 1 Ano" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
