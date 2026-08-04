import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Funcionario, DashboardMetrics } from '../../types';
import { formatCurrency } from '../../utils/dataParser';
import { Building2, Award, Users, TrendingUp, Calendar, ArrowLeft, Percent } from 'lucide-react';

interface OverviewTabProps {
  data: Funcionario[];
  metrics: DashboardMetrics;
  onSelectGrupo: (grupo: string) => void;
  onSelectCargo: (cargo: string) => void;
  selectedGrupoFilter?: string;
  selectedAnoFilter?: string;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data,
  metrics,
  onSelectGrupo,
  onSelectCargo,
  selectedGrupoFilter = '',
  selectedAnoFilter = '',
}) => {
  const [selectedYearForMonthly, setSelectedYearForMonthly] = useState<number | null>(null);

  const activeYearForMonthly = selectedYearForMonthly || (selectedAnoFilter ? parseInt(selectedAnoFilter, 10) : null);

  // 1. Status Donut Data
  const statusChartData = [
    { name: 'Ativos (Sem Demissão)', value: metrics.totalAtivos, color: '#10b981' },
    { name: 'Desligados', value: metrics.totalDesligados, color: '#f43f5e' },
  ];

  // 2. Admissions vs Dismissals by Year
  const yearMap: { [year: number]: { ano: number; admissoes: number; demissoes: number } } = {};
  data.forEach((item) => {
    if (item.anoAdmissao) {
      if (!yearMap[item.anoAdmissao]) yearMap[item.anoAdmissao] = { ano: item.anoAdmissao, admissoes: 0, demissoes: 0 };
      yearMap[item.anoAdmissao].admissoes += 1;
    }
    if (item.anoDemissao) {
      if (!yearMap[item.anoDemissao]) yearMap[item.anoDemissao] = { ano: item.anoDemissao, admissoes: 0, demissoes: 0 };
      yearMap[item.anoDemissao].demissoes += 1;
    }
  });

  const yearChartData = Object.values(yearMap)
    .filter((y) => y.ano >= 2015 && y.ano <= 2026)
    .sort((a, b) => a.ano - b.ano);

  // 2b. Monthly breakdown for active selected year
  const monthlyDataForSelectedYear = useMemo(() => {
    if (!activeYearForMonthly) return [];

    const months = MONTH_NAMES.map((m, idx) => ({
      mesIndex: idx + 1,
      mesNome: m,
      admissoes: 0,
      demissoes: 0,
    }));

    data.forEach((item) => {
      // Check admission month
      if (item.dataAdmissao && item.anoAdmissao === activeYearForMonthly) {
        const parts = item.dataAdmissao.split('/');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 12) {
            months[m - 1].admissoes += 1;
          }
        } else {
          const d = new Date(item.dataAdmissao);
          if (!isNaN(d.getTime())) {
            months[d.getMonth()].admissoes += 1;
          }
        }
      }

      // Check dismissal month
      if (item.dataDemissao && item.anoDemissao === activeYearForMonthly) {
        const parts = item.dataDemissao.split('/');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 12) {
            months[m - 1].demissoes += 1;
          }
        } else {
          const d = new Date(item.dataDemissao);
          if (!isNaN(d.getTime())) {
            months[d.getMonth()].demissoes += 1;
          }
        }
      }
    });

    return months;
  }, [data, activeYearForMonthly]);

  // 3. Top 10 Grupos Econômicos by Total Alocados
  const grupoMap: { [grupo: string]: { grupo: string; total: number; ativos: number; desligados: number; salarioMedio: number; somaSalario: number } } = {};
  data.forEach((item) => {
    const g = item.grupoEconomico || 'Outros';
    if (!grupoMap[g]) {
      grupoMap[g] = { grupo: g, total: 0, ativos: 0, desligados: 0, salarioMedio: 0, somaSalario: 0 };
    }
    grupoMap[g].total += 1;
    if (item.isAtivo) grupoMap[g].ativos += 1;
    else grupoMap[g].desligados += 1;
    grupoMap[g].somaSalario += item.salario;
  });

  const topGrupos = Object.values(grupoMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((g) => ({
      ...g,
      salarioMedio: g.total > 0 ? g.somaSalario / g.total : 0,
      shortName: g.grupo.length > 25 ? g.grupo.substring(0, 25) + '...' : g.grupo,
    }));

  // 4. Breakdown by Vínculo Empregatício (% Percentage)
  const vinculoMap: { [vinculo: string]: number } = {};
  data.forEach((item) => {
    const v = item.vinculo || 'Não informado';
    vinculoMap[v] = (vinculoMap[v] || 0) + 1;
  });

  const totalBaseCount = data.length || 1;
  const vinculoPercentData = Object.entries(vinculoMap)
    .map(([name, count]) => {
      const percentage = Math.round((count / totalBaseCount) * 1000) / 10;
      return { name, count, percentage };
    })
    .sort((a, b) => b.count - a.count);

  const VINCULO_COLORS = ['#470082', '#0284c7', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Section: Admissions vs Dismissals + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Admissões vs Demissões - Bento Col 8 (Supports Year -> Month drilldown) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#470082]" />
                  {activeYearForMonthly
                    ? `Evolução Mês a Mês (${activeYearForMonthly})`
                    : 'Evolução de Contratações vs Desligamentos'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeYearForMonthly
                    ? `Detalhamento mensal de admissões e desligamentos em ${activeYearForMonthly}`
                    : 'Clique em um ano no gráfico ou selecione abaixo para ver o detalhamento mês a mês'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeYearForMonthly && (
                  <button
                    onClick={() => setSelectedYearForMonthly(null)}
                    className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-[#470082] hover:bg-purple-100 rounded-lg border border-purple-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para Anos</span>
                  </button>
                )}

                <div className="flex items-center gap-3 text-xs font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> Admissões</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Demissões</div>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                {activeYearForMonthly ? (
                  /* Monthly View */
                  <BarChart data={monthlyDataForSelectedYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mesNome" stroke="#334155" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        Number(val).toLocaleString('pt-BR') + ' pessoas',
                        name === 'admissoes' ? 'Admissões' : 'Demissões'
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    {/* High contrast: Admissões = #0284c7 (Vibrant Blue), Demissões = #ef4444 (Vibrant Red) */}
                    <Bar dataKey="admissoes" name="Admissões" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="demissoes" name="Demissões" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  /* Annual View with Bar Click Handler */
                  <BarChart
                    data={yearChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const clickedAno = e.activePayload[0].payload.ano;
                        if (clickedAno) setSelectedYearForMonthly(clickedAno);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="ano" stroke="#334155" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        Number(val).toLocaleString('pt-BR') + ' pessoas',
                        name === 'admissoes' ? 'Admissões' : 'Demissões'
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    {/* High contrast: Admissões = #0284c7 (Vibrant Blue), Demissões = #ef4444 (Vibrant Red) */}
                    <Bar dataKey="admissoes" name="Admissões" fill="#0284c7" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                    <Bar dataKey="demissoes" name="Demissões" fill="#ef4444" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year Quick Selector Buttons */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">
              {activeYearForMonthly ? `Exibindo mês a mês de ${activeYearForMonthly}` : 'Selecione um ano para detalhar:'}
            </span>
            
            <div className="flex flex-wrap gap-1">
              {yearChartData.slice(-8).map((y) => (
                <button
                  key={y.ano}
                  onClick={() => setSelectedYearForMonthly(y.ano)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    activeYearForMonthly === y.ano
                      ? 'bg-[#470082] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-[#470082]'
                  }`}
                >
                  {y.ano}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Distribution (Pie / Donut) - Bento Col 4 */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-[#470082]" />
                Distribuição de Status
              </h3>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                Ativos vs Desligados
              </span>
            </div>

            <div className="h-52 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [Number(val).toLocaleString('pt-BR') + ' pessoas', 'Total']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Badge */}
              <div className="absolute text-center pointer-events-none">
                <p className="text-xl font-bold text-slate-900">{metrics.totalRecords.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Base</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-800 uppercase">Ativos</p>
              <p className="text-lg font-bold text-emerald-900">{metrics.totalAtivos.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-emerald-700 font-semibold">{metrics.percentAtivos}% da base</p>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
              <p className="text-[10px] font-bold text-rose-800 uppercase">Desligados</p>
              <p className="text-lg font-bold text-rose-900">{metrics.totalDesligados.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-rose-700 font-semibold">{metrics.percentDesligados}% da base</p>
            </div>
          </div>
        </div>

      </div>

      {/* Middle Section: Top 10 Grupos Econômicos (ONLY shown when NO specific Grupo Economico filter is selected) */}
      {!selectedGrupoFilter && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#470082]" />
                Ranking de Alocados por Grupo Econômico
              </h3>
              <p className="text-[11px] text-slate-500">Clique para filtrar os dados do painel por Grupo Econômico específico</p>
            </div>
            <span className="text-xs font-semibold text-[#470082] bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg">
              {metrics.totalGruposEconomicos} Grupos Registrados
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Horizontal Bar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topGrupos} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="shortName" type="category" stroke="#334155" width={140} tick={{ fontSize: 11, fontWeight: 500 }} />
                  <Tooltip
                    formatter={(value: any) => [Number(value).toLocaleString('pt-BR') + ' alocados', 'Total']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="total" fill="#470082" radius={[0, 6, 6, 0]}>
                    {topGrupos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#470082' : index === 1 ? '#0284c7' : index === 2 ? '#8205dd' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 10 List Table */}
            <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
              {topGrupos.map((item, idx) => (
                <div
                  key={item.grupo}
                  onClick={() => onSelectGrupo(item.grupo)}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] ${
                      idx === 0 ? 'bg-[#470082] text-white' :
                      idx === 1 ? 'bg-sky-600 text-white' :
                      idx === 2 ? 'bg-purple-100 text-[#470082]' : 'bg-slate-200 text-slate-700'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#470082] transition-colors">
                        {item.grupo}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Média Salarial: {formatCurrency(item.salarioMedio)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900">
                      {item.total.toLocaleString('pt-BR')}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {item.ativos} Ativos / {item.desligados} Desligados
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section: Breakdown % by Vínculo Empregatício (Pie + Progress Percentages) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#470082]" />
              Distribuição % por Vínculo Empregatício
            </h3>
            <p className="text-[11px] text-slate-500">Proporção percentual das modalidades de contratação na base atual</p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {metrics.totalRecords.toLocaleString('pt-BR')} Colaboradores Totais
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Donut Chart */}
          <div className="lg:col-span-5 h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vinculoPercentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {vinculoPercentData.map((entry, index) => (
                    <Cell key={`cell-vinculo-${index}`} fill={VINCULO_COLORS[index % VINCULO_COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${Number(val).toLocaleString('pt-BR')} alocações (${item.payload.percentage}%)`,
                    'Total'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute text-center pointer-events-none">
              <p className="text-2xl font-black text-slate-900">{vinculoPercentData.length}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Modalidades</p>
            </div>
          </div>

          {/* Detailed Percentage Bar List */}
          <div className="lg:col-span-7 space-y-3">
            {vinculoPercentData.map((item, idx) => (
              <div key={item.name} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: VINCULO_COLORS[idx % VINCULO_COLORS.length] }}
                    />
                    <span className="text-slate-800">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#470082] text-sm font-extrabold">{item.percentage}%</span>
                    <span className="text-slate-400 font-medium text-[11px] ml-2">
                      ({item.count.toLocaleString('pt-BR')} alocados)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: VINCULO_COLORS[idx % VINCULO_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
};
