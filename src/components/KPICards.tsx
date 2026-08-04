import React from 'react';
import { Users, UserCheck, UserX, Wallet, TrendingUp, ArrowUpRight, Percent } from 'lucide-react';
import { DashboardMetrics } from '../types';
import { formatCurrency } from '../utils/dataParser';

interface KPICardsProps {
  metrics: DashboardMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Total Alocados - Bento Module 1 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ativos Totais</span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-[#470082]">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight font-['Barlow']">
              {metrics.totalRecords.toLocaleString('pt-BR')}
            </span>
            <span className="text-[#470082] bg-purple-100 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Base
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#470082] h-1.5 rounded-full w-full" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {metrics.totalGruposEconomicos} Grupos Econômicos mapeados
          </p>
        </div>
      </div>

      {/* Ativos (Sem Demissão) - Bento Module 2 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Funcionários Ativos</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight font-['Barlow']">
              {metrics.totalAtivos.toLocaleString('pt-BR')}
            </span>
            <span className="text-emerald-700 bg-emerald-100 text-[11px] font-bold px-2 py-0.5 rounded-md">
              {metrics.percentAtivos}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${metrics.percentAtivos}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Contratos sem data de demissão registrada
          </p>
        </div>
      </div>

      {/* Desligados - Bento Module 3 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Desligados</span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
            <UserX className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight font-['Barlow']">
              {metrics.totalDesligados.toLocaleString('pt-BR')}
            </span>
            <span className="text-rose-600 bg-rose-100 text-[11px] font-bold px-2 py-0.5 rounded-md">
              {metrics.percentDesligados}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${metrics.percentDesligados}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Histórico acumulado com data de demissão
          </p>
        </div>
      </div>

      {/* Salário Médio - Dark Bento Highlight Module 4 */}
      <div className="bg-[#250244] text-white rounded-2xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#ff27f9]/20 pointer-events-none group-hover:scale-125 transition-transform" />
        <div className="flex items-center justify-between z-10">
          <span className="text-xs font-semibold text-purple-200/80 uppercase tracking-wider">Salário Médio (Ativos)</span>
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#c9f545]">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 z-10">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#c9f545] tracking-tight font-['Barlow']">
              {formatCurrency(metrics.mediaSalariaAtivos)}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#c9f545] h-1.5 rounded-full w-[75%]" />
          </div>
          <p className="text-[11px] text-purple-200/70 mt-2">
            Média Geral da base: {formatCurrency(metrics.mediaSalariaGeral)}
          </p>
        </div>
      </div>

    </div>
  );
};

