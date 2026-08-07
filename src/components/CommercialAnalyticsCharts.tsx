import React, { useMemo } from 'react';
import { Funcionario } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Briefcase,
  TrendingUp,
  Calendar,
  Users,
  Repeat,
  UserPlus,
  UserMinus,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface CommercialAnalyticsChartsProps {
  workers: Funcionario[];
  title?: string;
  subtitle?: string;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export const CommercialAnalyticsCharts: React.FC<CommercialAnalyticsChartsProps> = ({
  workers,
  title = 'Análise de Contratos e Evolução de Carteira',
  subtitle = 'Estudo de migração de tipo de contrato (Temporário x CLT) e acompanhamento de admissões, prorrogações e desligamentos.',
}) => {
  // Filter active workers
  const activeWorkers = useMemo(() => workers.filter((w) => w.isAtivo), [workers]);

  // Distribution by contract type (Vínculo Empregatício)
  const contractDistribution = useMemo(() => {
    const map: Record<string, { count: number; salary: number }> = {};
    activeWorkers.forEach((w) => {
      let type = (w.vinculo || 'NÃO INFORMADO').toUpperCase().trim();
      if (type.includes('TEMPORAR')) type = 'TEMPORÁRIO';
      else if (type.includes('CLT') || type.includes('EFETIV')) type = 'CLT';
      else if (type.includes('ESTAG')) type = 'ESTÁGIO';
      else if (type.includes('PJ') || type.includes('PRESTAD')) type = 'PJ';
      else if (type.includes('APRENDIZ')) type = 'APRENDIZ';

      if (!map[type]) map[type] = { count: 0, salary: 0 };
      map[type].count += 1;
      map[type].salary += w.salario || 0;
    });

    const totalActive = activeWorkers.length || 1;
    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        count: val.count,
        salary: val.salary,
        percentage: ((val.count / totalActive) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeWorkers]);

  // Temporary / Expiring Contracts Opportunities
  const tempAndExpiringStats = useMemo(() => {
    const now = new Date();
    const in90Days = new Date();
    in90Days.setDate(now.getDate() + 90);

    let tempCount = 0;
    let tempFolha = 0;
    let expiringSoonCount = 0;

    activeWorkers.forEach((w) => {
      const v = (w.vinculo || '').toUpperCase();
      if (v.includes('TEMPORAR') || v.includes('ESTAG')) {
        tempCount++;
        tempFolha += w.salario || 0;
      }

      if (w.dataVctoProrrogacao || w.dataVctoContrato) {
        const vctoStr = w.dataVctoProrrogacao || w.dataVctoContrato;
        const d = new Date(vctoStr);
        if (!isNaN(d.getTime()) && d >= now && d <= in90Days) {
          expiringSoonCount++;
        }
      }
    });

    return { tempCount, tempFolha, expiringSoonCount };
  }, [activeWorkers]);

  // Monthly timeline movement (Admissões, Prorrogações, Desligamentos)
  const monthlyMovements = useMemo(() => {
    const now = new Date();
    const monthsMap = new Map<
      string,
      { label: string; admissiveis: number; prorrogacoes: number; desligamentos: number }
    >();

    // Build array for past 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      monthsMap.set(key, { label, admissiveis: 0, prorrogacoes: 0, desligamentos: 0 });
    }

    workers.forEach((w) => {
      // Admissões
      if (w.dataAdmissao) {
        const d = new Date(w.dataAdmissao);
        if (!isNaN(d.getTime())) {
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthsMap.has(k)) {
            monthsMap.get(k)!.admissiveis += 1;
          }
        }
      }

      // Prorrogações
      if (w.dataVctoProrrogacao) {
        const d = new Date(w.dataVctoProrrogacao);
        if (!isNaN(d.getTime())) {
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthsMap.has(k)) {
            monthsMap.get(k)!.prorrogacoes += 1;
          }
        }
      }

      // Desligamentos
      if (w.dataDemissao) {
        const d = new Date(w.dataDemissao);
        if (!isNaN(d.getTime())) {
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthsMap.has(k)) {
            monthsMap.get(k)!.desligamentos += 1;
          }
        }
      }
    });

    return Array.from(monthsMap.values());
  }, [workers]);

  if (workers.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-semibold">Nenhum colaborador encontrado na carteira selecionada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#401669]" />
            {title}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        </div>

        {/* Opportunity Badge */}
        {tempAndExpiringStats.tempCount > 0 && (
          <div className="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-amber-900 tracking-wider block">
                Oportunidade de Migração de Contrato
              </span>
              <span className="text-xs font-bold text-amber-950">
                {tempAndExpiringStats.tempCount} colaboradores temporários/estágio (R$ {tempAndExpiringStats.tempFolha.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Distribution by Contract Type */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Alocados por Tipo de Contrato
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                {activeWorkers.length} Ativos
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Divisão da equipe ativa para identificação de renovações e efetivações.
            </p>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contractDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {contractDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${value} colaboradores (${props.payload.percentage}%) - Folha: R$ ${(
                      props.payload.salary || 0
                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    props.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed breakdown list */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-40 overflow-y-auto">
            {contractDistribution.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-bold text-slate-800">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 mr-2">{item.count} ({item.percentage}%)</span>
                  <span className="text-[10px] text-slate-500">
                    R$ {item.salary.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Timeline Evolution of Movements */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#401669]" />
                Evolução da Carteira (12 Meses)
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">
                Admissões, Prorrogações & Desligamentos
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Acompanhe novos ingressos, extensões de prazos e saídas para gerenciar o turnover.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyMovements} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="admissiveis" name="Admissões" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prorrogacoes" name="Prorrogações" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="desligamentos" name="Desligamentos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Strategy Tip Box */}
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#401669] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-[#401669] block mb-0.5">Estratégia de Expansão de Faturamento:</strong>
              Monitore os picos de vencimento de prorrogação para ofertar antecipadamente a migração do contrato temporário para CLT fixo, estendendo a permanência do profissional no cliente e garantindo receita recorrente.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
