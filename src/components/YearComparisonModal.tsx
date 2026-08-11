import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  BarChart3,
  Layers,
  Users,
  DollarSign,
  UserX,
  CheckCircle2,
  Printer,
  Briefcase,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Funcionario } from '../types';
import { parseDateDetails } from '../utils/dataParser';

interface YearComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredData: Funcionario[];
  allData: Funcionario[];
}

const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
];

export const YearComparisonModal: React.FC<YearComparisonModalProps> = ({
  isOpen,
  onClose,
  filteredData,
  allData
}) => {
  const [useFilteredSet, setUseFilteredSet] = useState<boolean>(true);
  const [yearA, setYearA] = useState<number>(2025);
  const [yearB, setYearB] = useState<number>(2024);
  const [activeChartTab, setActiveChartTab] = useState<'admissoes' | 'demissoes' | 'saldo'>('admissoes');

  const currentDataset = useFilteredSet ? filteredData : allData;

  // Extract available years from dataset
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allData.forEach((item) => {
      const adm = parseDateDetails(item.dataAdmissao);
      if (adm.year && adm.year >= 2010 && adm.year <= 2026) years.add(adm.year);
      const dem = parseDateDetails(item.dataDemissao);
      if (dem.year && dem.year >= 2010 && dem.year <= 2026) years.add(dem.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allData]);

  // Compute monthly data for Year A and Year B
  const comparisonData = useMemo(() => {
    const monthly = MONTH_NAMES.map((m, idx) => ({
      mesIndex: idx + 1,
      mesNome: m,
      // Year A metrics
      admissoesA: 0,
      demissoesA: 0,
      saldoA: 0,
      massaSalA: 0,
      // Year B metrics
      admissoesB: 0,
      demissoesB: 0,
      saldoB: 0,
      massaSalB: 0
    }));

    // Cargos mapping
    const cargosA: { [key: string]: number } = {};
    const cargosB: { [key: string]: number } = {};

    // Motivos mapping
    const motivosA: { [key: string]: number } = {};
    const motivosB: { [key: string]: number } = {};

    // Vinculo (Tipo de Contrato) mapping
    const vinculoMapA: { [key: string]: { admissoes: number; demissoes: number; massaSal: number } } = {};
    const vinculoMapB: { [key: string]: { admissoes: number; demissoes: number; massaSal: number } } = {};

    currentDataset.forEach((item) => {
      const vinculoStr = (item.vinculo || 'Outros').trim();

      // Admissions
      const adm = parseDateDetails(item.dataAdmissao);
      if (adm.year === yearA && adm.month) {
        monthly[adm.month - 1].admissoesA += 1;
        monthly[adm.month - 1].massaSalA += item.salario || 0;
        if (item.cargo) cargosA[item.cargo] = (cargosA[item.cargo] || 0) + 1;

        if (!vinculoMapA[vinculoStr]) vinculoMapA[vinculoStr] = { admissoes: 0, demissoes: 0, massaSal: 0 };
        vinculoMapA[vinculoStr].admissoes += 1;
        vinculoMapA[vinculoStr].massaSal += item.salario || 0;
      } else if (adm.year === yearB && adm.month) {
        monthly[adm.month - 1].admissoesB += 1;
        monthly[adm.month - 1].massaSalB += item.salario || 0;
        if (item.cargo) cargosB[item.cargo] = (cargosB[item.cargo] || 0) + 1;

        if (!vinculoMapB[vinculoStr]) vinculoMapB[vinculoStr] = { admissoes: 0, demissoes: 0, massaSal: 0 };
        vinculoMapB[vinculoStr].admissoes += 1;
        vinculoMapB[vinculoStr].massaSal += item.salario || 0;
      }

      // Dismissals
      const dem = parseDateDetails(item.dataDemissao);
      if (dem.year === yearA && dem.month) {
        monthly[dem.month - 1].demissoesA += 1;
        const mot = item.motivoDesligamento || 'Não especificado';
        motivosA[mot] = (motivosA[mot] || 0) + 1;

        if (!vinculoMapA[vinculoStr]) vinculoMapA[vinculoStr] = { admissoes: 0, demissoes: 0, massaSal: 0 };
        vinculoMapA[vinculoStr].demissoes += 1;
      } else if (dem.year === yearB && dem.month) {
        monthly[dem.month - 1].demissoesB += 1;
        const mot = item.motivoDesligamento || 'Não especificado';
        motivosB[mot] = (motivosB[mot] || 0) + 1;

        if (!vinculoMapB[vinculoStr]) vinculoMapB[vinculoStr] = { admissoes: 0, demissoes: 0, massaSal: 0 };
        vinculoMapB[vinculoStr].demissoes += 1;
      }
    });

    // Calculate saldos
    monthly.forEach((m) => {
      m.saldoA = m.admissoesA - m.demissoesA;
      m.saldoB = m.admissoesB - m.demissoesB;
    });

    // Vinculo Comparison Array
    const allVinculos = Array.from(
      new Set([...Object.keys(vinculoMapA), ...Object.keys(vinculoMapB)])
    ).sort();

    const vinculoComparison = allVinculos
      .map((v) => {
        const admA = vinculoMapA[v]?.admissoes || 0;
        const admB = vinculoMapB[v]?.admissoes || 0;
        const demA = vinculoMapA[v]?.demissoes || 0;
        const demB = vinculoMapB[v]?.demissoes || 0;
        const saldoA = admA - demA;
        const saldoB = admB - demB;
        const diffAdm = admA - admB;
        const percAdm =
          admB > 0 ? Math.round(((admA - admB) / admB) * 1000) / 10 : 0;
        const diffDem = demA - demB;
        const diffSaldo = saldoA - saldoB;

        return {
          vinculo: v,
          admissoesA: admA,
          admissoesB: admB,
          diffAdm,
          percAdm,
          demissoesA: demA,
          demissoesB: demB,
          diffDem,
          saldoA,
          saldoB,
          diffSaldo
        };
      })
      .sort((a, b) => b.admissoesA + b.admissoesB - (a.admissoesA + a.admissoesB));

    // Totals
    const totalAdmissoesA = monthly.reduce((acc, curr) => acc + curr.admissoesA, 0);
    const totalAdmissoesB = monthly.reduce((acc, curr) => acc + curr.admissoesB, 0);
    const totalDemissoesA = monthly.reduce((acc, curr) => acc + curr.demissoesA, 0);
    const totalDemissoesB = monthly.reduce((acc, curr) => acc + curr.demissoesB, 0);
    const totalSaldoA = totalAdmissoesA - totalDemissoesA;
    const totalSaldoB = totalAdmissoesB - totalDemissoesB;
    const totalMassaSalA = monthly.reduce((acc, curr) => acc + curr.massaSalA, 0);
    const totalMassaSalB = monthly.reduce((acc, curr) => acc + curr.massaSalB, 0);

    // Sorted Cargos
    const topCargosA = Object.entries(cargosA)
      .map(([cargo, count]) => ({ cargo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topCargosB = Object.entries(cargosB)
      .map(([cargo, count]) => ({ cargo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Sorted Motivos
    const topMotivosA = Object.entries(motivosA)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topMotivosB = Object.entries(motivosB)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      monthly,
      totals: {
        totalAdmissoesA,
        totalAdmissoesB,
        diffAdmissoes: totalAdmissoesA - totalAdmissoesB,
        percAdmissoes:
          totalAdmissoesB > 0
            ? Math.round(((totalAdmissoesA - totalAdmissoesB) / totalAdmissoesB) * 1000) / 10
            : 0,

        totalDemissoesA,
        totalDemissoesB,
        diffDemissoes: totalDemissoesA - totalDemissoesB,
        percDemissoes:
          totalDemissoesB > 0
            ? Math.round(((totalDemissoesA - totalDemissoesB) / totalDemissoesB) * 1000) / 10
            : 0,

        totalSaldoA,
        totalSaldoB,
        diffSaldo: totalSaldoA - totalSaldoB,

        totalMassaSalA,
        totalMassaSalB,
        diffMassaSal: totalMassaSalA - totalMassaSalB,
        percMassaSal:
          totalMassaSalB > 0
            ? Math.round(((totalMassaSalA - totalMassaSalB) / totalMassaSalB) * 1000) / 10
            : 0
      },
      topCargosA,
      topCargosB,
      topMotivosA,
      topMotivosB,
      vinculoComparison
    };
  }, [currentDataset, yearA, yearB]);

  if (!isOpen) return null;

  const {
    totals,
    monthly,
    topCargosA,
    topCargosB,
    topMotivosA,
    topMotivosB,
    vinculoComparison
  } = comparisonData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#2a0052] via-[#470082] to-[#6b02a3] px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 rounded-xl border border-white/20">
                <BarChart3 className="w-5 h-5 text-[#ff27f9]" />
              </span>
              <h2 className="text-xl font-extrabold font-['Barlow'] tracking-wide">
                Comparativo Anual ({yearA} vs {yearB})
              </h2>
            </div>
            <p className="text-xs text-purple-200 mt-1">
              Análise comparativa de contratações, desligamentos e movimentação mensal de pessoal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Dataset */}
            <button
              onClick={() => setUseFilteredSet(!useFilteredSet)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                useFilteredSet
                  ? 'bg-amber-400 text-slate-900 border-amber-300 font-extrabold'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Alternar entre dados filtrados do painel ou toda a base"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{useFilteredSet ? 'Filtros Ativos' : 'Toda a Base'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all cursor-pointer"
              title="Imprimir relatório comparativo"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-rose-500/80 text-white rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
          
          {/* Controls Bar: Year Selectors & Presets */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Year A Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Ano Principal (Ano A):</span>
                <select
                  value={yearA}
                  onChange={(e) => setYearA(Number(e.target.value))}
                  className="px-3 py-1.5 bg-purple-50 text-[#470082] font-extrabold text-sm rounded-xl border border-purple-200 focus:outline-hidden focus:ring-2 focus:ring-[#470082]"
                >
                  {availableYears.map((y) => (
                    <option key={`a-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-sm font-black text-purple-400 hidden sm:inline">VS</span>

              {/* Year B Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Ano Comparativo (Ano B):</span>
                <select
                  value={yearB}
                  onChange={(e) => setYearB(Number(e.target.value))}
                  className="px-3 py-1.5 bg-sky-50 text-sky-800 font-extrabold text-sm rounded-xl border border-sky-200 focus:outline-hidden focus:ring-2 focus:ring-sky-600"
                >
                  {availableYears.map((y) => (
                    <option key={`b-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Atalhos:</span>
              {[
                { label: '2026 vs 2025', a: 2026, b: 2025 },
                { label: '2025 vs 2024', a: 2025, b: 2024 },
                { label: '2024 vs 2023', a: 2024, b: 2023 },
                { label: '2025 vs 2023', a: 2025, b: 2023 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setYearA(preset.a);
                    setYearB(preset.b);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    yearA === preset.a && yearB === preset.b
                      ? 'bg-[#470082] text-white border-[#470082]'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Admissões */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admissões Totais</span>
                <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {totals.totalAdmissoesA.toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-semibold text-slate-400">em {yearA}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {totals.totalAdmissoesB.toLocaleString('pt-BR')} em {yearB}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold ${
                    totals.diffAdmissoes >= 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {totals.diffAdmissoes >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {totals.diffAdmissoes > 0 ? `+${totals.diffAdmissoes}` : totals.diffAdmissoes} ({totals.percAdmissoes}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Demissões */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desligamentos Totais</span>
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <UserX className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {totals.totalDemissoesA.toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-semibold text-slate-400">em {yearA}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {totals.totalDemissoesB.toLocaleString('pt-BR')} em {yearB}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold ${
                    totals.diffDemissoes <= 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {totals.diffDemissoes >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {totals.diffDemissoes > 0 ? `+${totals.diffDemissoes}` : totals.diffDemissoes} ({totals.percDemissoes}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Saldo Líquido */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Líquido</span>
                <span className="p-1.5 bg-purple-50 text-[#470082] rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-extrabold text-[#470082]">
                    {totals.totalSaldoA > 0 ? `+${totals.totalSaldoA}` : totals.totalSaldoA}{' '}
                    <span className="text-xs font-semibold text-slate-400">em {yearA}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {totals.totalSaldoB > 0 ? `+${totals.totalSaldoB}` : totals.totalSaldoB} em {yearB}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold ${
                    totals.diffSaldo >= 0
                      ? 'bg-purple-50 text-[#470082] border border-purple-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span>
                    Δ {totals.diffSaldo > 0 ? `+${totals.diffSaldo}` : totals.diffSaldo}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Massa Salarial Admitida */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Massa Salarial Admitida</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-900 truncate max-w-[150px]">
                    R$ {totals.totalMassaSalA.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[150px]">
                    R$ {totals.totalMassaSalB.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ({yearB})
                  </div>
                </div>
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                  <span>{totals.percMassaSal > 0 ? `+${totals.percMassaSal}%` : `${totals.percMassaSal}%`}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Chart Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-['Barlow']">
                  Comparação Mensal: {yearA} (Roxo) vs {yearB} (Azul)
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhe mês a mês o desempenho acumulado de {yearA} em relação a {yearB}.
                </p>
              </div>

              {/* Chart Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setActiveChartTab('admissoes')}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    activeChartTab === 'admissoes' ? 'bg-[#470082] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admissões
                </button>
                <button
                  onClick={() => setActiveChartTab('demissoes')}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    activeChartTab === 'demissoes' ? 'bg-[#470082] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Demissões
                </button>
                <button
                  onClick={() => setActiveChartTab('saldo')}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    activeChartTab === 'saldo' ? 'bg-[#470082] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Saldo Líquido
                </button>
              </div>
            </div>

            {/* Recharts Component */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mesNome" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString('pt-BR')} pessoas`,
                      name
                    ]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: '600' }} />

                  {activeChartTab === 'admissoes' && (
                    <>
                      <Bar dataKey="admissoesA" name={`Admissões ${yearA}`} fill="#470082" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="admissoesB" name={`Admissões ${yearB}`} fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {activeChartTab === 'demissoes' && (
                    <>
                      <Bar dataKey="demissoesA" name={`Demissões ${yearA}`} fill="#e11d48" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="demissoesB" name={`Demissões ${yearB}`} fill="#f97316" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {activeChartTab === 'saldo' && (
                    <>
                      <Bar dataKey="saldoA" name={`Saldo ${yearA}`} fill="#470082" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saldoB" name={`Saldo ${yearB}`} fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* Complete Monthly Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 font-['Barlow'] uppercase tracking-wider">
                Tabela Matriz Mensal ({yearA} vs {yearB})
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Detalhamento mês a mês de Jan a Dez
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Mês</th>
                    <th className="py-3 px-4 text-center bg-purple-50/50 text-[#470082]">Admissões {yearA}</th>
                    <th className="py-3 px-4 text-center bg-sky-50/50 text-sky-800">Admissões {yearB}</th>
                    <th className="py-3 px-4 text-center">Var. Adm.</th>
                    <th className="py-3 px-4 text-center bg-rose-50/50 text-rose-800">Demissões {yearA}</th>
                    <th className="py-3 px-4 text-center bg-amber-50/50 text-amber-800">Demissões {yearB}</th>
                    <th className="py-3 px-4 text-center">Var. Dem.</th>
                    <th className="py-3 px-4 text-center font-extrabold bg-purple-100/50 text-[#470082]">Saldo {yearA}</th>
                    <th className="py-3 px-4 text-center font-extrabold bg-sky-100/50 text-sky-800">Saldo {yearB}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.map((row) => {
                    const diffAdm = row.admissoesA - row.admissoesB;
                    const diffDem = row.demissoesA - row.demissoesB;

                    return (
                      <tr key={row.mesNome} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{row.mesNome}</td>

                        {/* Adm A */}
                        <td className="py-2.5 px-4 text-center font-extrabold text-[#470082] bg-purple-50/20">
                          {row.admissoesA}
                        </td>

                        {/* Adm B */}
                        <td className="py-2.5 px-4 text-center font-bold text-sky-700 bg-sky-50/20">
                          {row.admissoesB}
                        </td>

                        {/* Var Adm */}
                        <td className="py-2.5 px-4 text-center font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded-md ${
                              diffAdm > 0
                                ? 'text-emerald-700 font-bold'
                                : diffAdm < 0
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {diffAdm > 0 ? `+${diffAdm}` : diffAdm}
                          </span>
                        </td>

                        {/* Dem A */}
                        <td className="py-2.5 px-4 text-center font-extrabold text-rose-700 bg-rose-50/20">
                          {row.demissoesA}
                        </td>

                        {/* Dem B */}
                        <td className="py-2.5 px-4 text-center font-bold text-amber-700 bg-amber-50/20">
                          {row.demissoesB}
                        </td>

                        {/* Var Dem */}
                        <td className="py-2.5 px-4 text-center font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded-md ${
                              diffDem < 0
                                ? 'text-emerald-700 font-bold'
                                : diffDem > 0
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {diffDem > 0 ? `+${diffDem}` : diffDem}
                          </span>
                        </td>

                        {/* Saldo A */}
                        <td className="py-2.5 px-4 text-center font-black text-[#470082] bg-purple-100/30">
                          {row.saldoA > 0 ? `+${row.saldoA}` : row.saldoA}
                        </td>

                        {/* Saldo B */}
                        <td className="py-2.5 px-4 text-center font-black text-sky-800 bg-sky-100/30">
                          {row.saldoB > 0 ? `+${row.saldoB}` : row.saldoB}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3 px-4">TOTAL ACUMULADO</td>
                    <td className="py-3 px-4 text-center text-[#470082]">{totals.totalAdmissoesA}</td>
                    <td className="py-3 px-4 text-center text-sky-800">{totals.totalAdmissoesB}</td>
                    <td className="py-3 px-4 text-center">
                      {totals.diffAdmissoes > 0 ? `+${totals.diffAdmissoes}` : totals.diffAdmissoes}
                    </td>
                    <td className="py-3 px-4 text-center text-rose-700">{totals.totalDemissoesA}</td>
                    <td className="py-3 px-4 text-center text-amber-700">{totals.totalDemissoesB}</td>
                    <td className="py-3 px-4 text-center">
                      {totals.diffDemissoes > 0 ? `+${totals.diffDemissoes}` : totals.diffDemissoes}
                    </td>
                    <td className="py-3 px-4 text-center text-[#470082]">
                      {totals.totalSaldoA > 0 ? `+${totals.totalSaldoA}` : totals.totalSaldoA}
                    </td>
                    <td className="py-3 px-4 text-center text-sky-800">
                      {totals.totalSaldoB > 0 ? `+${totals.totalSaldoB}` : totals.totalSaldoB}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Side-by-side Top Cargos and Motivos Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Cargos Side-by-Side */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 font-['Barlow'] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#470082]" />
                Top 5 Cargos Mais Contratados
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Year A */}
                <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                  <div className="font-extrabold text-[#470082] border-b border-purple-200 pb-1.5 mb-2">
                    Ano {yearA}
                  </div>
                  {topCargosA.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">Sem contratações</p>
                  ) : (
                    <div className="space-y-2">
                      {topCargosA.map((item, idx) => (
                        <div key={item.cargo} className="flex items-center justify-between gap-1">
                          <span className="truncate text-slate-700 font-medium">
                            {idx + 1}. {item.cargo}
                          </span>
                          <span className="font-black text-[#470082]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year B */}
                <div className="bg-sky-50/50 p-3 rounded-2xl border border-sky-100">
                  <div className="font-extrabold text-sky-800 border-b border-sky-200 pb-1.5 mb-2">
                    Ano {yearB}
                  </div>
                  {topCargosB.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">Sem contratações</p>
                  ) : (
                    <div className="space-y-2">
                      {topCargosB.map((item, idx) => (
                        <div key={item.cargo} className="flex items-center justify-between gap-1">
                          <span className="truncate text-slate-700 font-medium">
                            {idx + 1}. {item.cargo}
                          </span>
                          <span className="font-black text-sky-800">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Motivos Desligamento Side-by-Side */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 font-['Barlow'] uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-600" />
                Principais Motivos de Desligamento
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Year A */}
                <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100">
                  <div className="font-extrabold text-rose-800 border-b border-rose-200 pb-1.5 mb-2">
                    Ano {yearA}
                  </div>
                  {topMotivosA.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">Sem desligamentos</p>
                  ) : (
                    <div className="space-y-2">
                      {topMotivosA.map((item, idx) => (
                        <div key={item.motivo} className="flex items-center justify-between gap-1">
                          <span className="truncate text-slate-700 font-medium">
                            {idx + 1}. {item.motivo}
                          </span>
                          <span className="font-black text-rose-700">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year B */}
                <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                  <div className="font-extrabold text-amber-800 border-b border-amber-200 pb-1.5 mb-2">
                    Ano {yearB}
                  </div>
                  {topMotivosB.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">Sem desligamentos</p>
                  ) : (
                    <div className="space-y-2">
                      {topMotivosB.map((item, idx) => (
                        <div key={item.motivo} className="flex items-center justify-between gap-1">
                          <span className="truncate text-slate-700 font-medium">
                            {idx + 1}. {item.motivo}
                          </span>
                          <span className="font-black text-amber-800">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Contract Type (Vinculo) Comparison Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-['Barlow'] uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#470082]" />
                  Comparativo por Tipo de Contrato (Vínculo Empregatício)
                </h3>
                <p className="text-xs text-slate-500">
                  Análise comparativa das contratações e desligamentos divididos por tipo de contrato entre {yearA} e {yearB}.
                </p>
              </div>
            </div>

            {/* Vinculo Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vinculoComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="vinculo" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString('pt-BR')} pessoas`,
                      name
                    ]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: '600' }} />
                  <Bar dataKey="admissoesA" name={`Admissões ${yearA}`} fill="#470082" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="admissoesB" name={`Admissões ${yearB}`} fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="demissoesA" name={`Demissões ${yearA}`} fill="#e11d48" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="demissoesB" name={`Demissões ${yearB}`} fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Vinculo Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tipo de Contrato (Vínculo)</th>
                    <th className="py-3 px-4 text-center bg-purple-50/50 text-[#470082]">Admissões {yearA}</th>
                    <th className="py-3 px-4 text-center bg-sky-50/50 text-sky-800">Admissões {yearB}</th>
                    <th className="py-3 px-4 text-center">Var. Adm.</th>
                    <th className="py-3 px-4 text-center bg-rose-50/50 text-rose-800">Demissões {yearA}</th>
                    <th className="py-3 px-4 text-center bg-amber-50/50 text-amber-800">Demissões {yearB}</th>
                    <th className="py-3 px-4 text-center">Var. Dem.</th>
                    <th className="py-3 px-4 text-center font-extrabold bg-purple-100/50 text-[#470082]">Saldo {yearA}</th>
                    <th className="py-3 px-4 text-center font-extrabold bg-sky-100/50 text-sky-800">Saldo {yearB}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vinculoComparison.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-4 text-center text-slate-400 italic">
                        Sem dados de tipo de contrato para o período selecionado.
                      </td>
                    </tr>
                  ) : (
                    vinculoComparison.map((row) => (
                      <tr key={row.vinculo} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#470082]"></span>
                          {row.vinculo}
                        </td>
                        <td className="py-2.5 px-4 text-center font-extrabold text-[#470082] bg-purple-50/20">
                          {row.admissoesA}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-sky-700 bg-sky-50/20">
                          {row.admissoesB}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded-md ${
                              row.diffAdm > 0
                                ? 'text-emerald-700 font-bold'
                                : row.diffAdm < 0
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.diffAdm > 0 ? `+${row.diffAdm}` : row.diffAdm} ({row.percAdm}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-extrabold text-rose-700 bg-rose-50/20">
                          {row.demissoesA}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-amber-700 bg-amber-50/20">
                          {row.demissoesB}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded-md ${
                              row.diffDem < 0
                                ? 'text-emerald-700 font-bold'
                                : row.diffDem > 0
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.diffDem > 0 ? `+${row.diffDem}` : row.diffDem}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-black text-[#470082] bg-purple-100/30">
                          {row.saldoA > 0 ? `+${row.saldoA}` : row.saldoA}
                        </td>
                        <td className="py-2.5 px-4 text-center font-black text-sky-800 bg-sky-100/30">
                          {row.saldoB > 0 ? `+${row.saldoB}` : row.saldoB}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Exibindo comparativo entre {yearA} e {yearB} ({currentDataset.length.toLocaleString('pt-BR')} registros analisados)</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#470082] hover:bg-[#340060] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Fechar Comparativo
          </button>
        </div>

      </div>
    </div>
  );
};
