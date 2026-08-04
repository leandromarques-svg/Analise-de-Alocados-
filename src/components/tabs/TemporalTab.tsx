import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Funcionario } from '../../types';
import { Calendar, TrendingUp, UserX, ArrowLeft } from 'lucide-react';

interface TemporalTabProps {
  data: Funcionario[];
  selectedAnoFilter?: string;
  onSelectAno?: (ano: string) => void;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const TemporalTab: React.FC<TemporalTabProps> = ({
  data,
  selectedAnoFilter = '',
  onSelectAno,
}) => {
  const [selectedYearRange, setSelectedYearRange] = useState<string>('all');
  const [localSelectedYear, setLocalSelectedYear] = useState<number | null>(
    selectedAnoFilter ? parseInt(selectedAnoFilter, 10) : null
  );

  const activeYear = localSelectedYear || (selectedAnoFilter ? parseInt(selectedAnoFilter, 10) : null);

  // 1. Annual mapping
  const yearMap: { [year: number]: { ano: number; admissoes: number; demissoes: number; saldo: number } } = {};
  data.forEach((item) => {
    if (item.anoAdmissao) {
      if (!yearMap[item.anoAdmissao]) yearMap[item.anoAdmissao] = { ano: item.anoAdmissao, admissoes: 0, demissoes: 0, saldo: 0 };
      yearMap[item.anoAdmissao].admissoes += 1;
    }
    if (item.anoDemissao) {
      if (!yearMap[item.anoDemissao]) yearMap[item.anoDemissao] = { ano: item.anoDemissao, admissoes: 0, demissoes: 0, saldo: 0 };
      yearMap[item.anoDemissao].demissoes += 1;
    }
  });

  const yearList = Object.values(yearMap)
    .filter((y) => y.ano >= 2010 && y.ano <= 2026)
    .sort((a, b) => a.ano - b.ano)
    .map((y) => ({
      ...y,
      saldo: y.admissoes - y.demissoes,
    }));

  const filteredYears = selectedYearRange === '5y'
    ? yearList.slice(-5)
    : selectedYearRange === '10y'
    ? yearList.slice(-10)
    : yearList;

  // 2. Monthly calculation for active selected year
  const monthlyData = useMemo(() => {
    if (!activeYear) return [];

    const months = MONTH_NAMES.map((m, idx) => ({
      mesIndex: idx + 1,
      mesNome: m,
      admissoes: 0,
      demissoes: 0,
      saldo: 0,
    }));

    data.forEach((item) => {
      // Admissions in active year
      if (item.dataAdmissao && item.anoAdmissao === activeYear) {
        const parts = item.dataAdmissao.split('/');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 12) months[m - 1].admissoes += 1;
        } else {
          const d = new Date(item.dataAdmissao);
          if (!isNaN(d.getTime())) months[d.getMonth()].admissoes += 1;
        }
      }

      // Dismissals in active year
      if (item.dataDemissao && item.anoDemissao === activeYear) {
        const parts = item.dataDemissao.split('/');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m >= 1 && m <= 12) months[m - 1].demissoes += 1;
        } else {
          const d = new Date(item.dataDemissao);
          if (!isNaN(d.getTime())) months[d.getMonth()].demissoes += 1;
        }
      }
    });

    return months.map((m) => ({
      ...m,
      saldo: m.admissoes - m.demissoes,
    }));
  }, [data, activeYear]);

  // Motivos do Desligamento
  const motivoMap: { [motivo: string]: number } = {};
  data.forEach((item) => {
    if (!item.isAtivo) {
      const m = item.motivoDesligamento || 'Não especificado';
      motivoMap[m] = (motivoMap[m] || 0) + 1;
    }
  });

  const motivoList = Object.entries(motivoMap)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count);

  const totalDemissoesAteHoje = data.filter((d) => d.anoDemissao !== null).length;

  const handleSelectYear = (anoNum: number | null) => {
    setLocalSelectedYear(anoNum);
    if (onSelectAno) {
      onSelectAno(anoNum ? String(anoNum) : '');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Controls & Header */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#470082] flex items-center gap-2 font-['Barlow']">
            <Calendar className="w-6 h-6 text-[#9f04d4]" />
            {activeYear
              ? `Evolução Mês a Mês do Ano ${activeYear}`
              : 'Análise Temporal de Ativos e Desligados por Ano'}
          </h2>
          <p className="text-xs text-[#78549e] mt-1">
            {activeYear
              ? `Exibindo a parcial mensal de admissões, demissões e saldo líquido em ${activeYear}.`
              : 'Clique em um ano para detalhar a evolução de janeiro a dezembro.'}
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {activeYear && (
            <button
              onClick={() => handleSelectYear(null)}
              className="px-3 py-1.5 text-xs font-bold bg-purple-100 hover:bg-purple-200 text-[#470082] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-purple-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Todos os Anos</span>
            </button>
          )}

          {!activeYear && (
            <div className="flex items-center gap-1.5 p-1 bg-[#f4ebfb] rounded-xl border border-[#e0c4f8]">
              <button
                onClick={() => setSelectedYearRange('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedYearRange === 'all' ? 'bg-[#470082] text-white' : 'text-[#470082] hover:bg-[#e6d0fa]'
                }`}
              >
                Todo o Histórico
              </button>
              <button
                onClick={() => setSelectedYearRange('10y')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedYearRange === '10y' ? 'bg-[#470082] text-white' : 'text-[#470082] hover:bg-[#e6d0fa]'
                }`}
              >
                Últimos 10 Anos
              </button>
              <button
                onClick={() => setSelectedYearRange('5y')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedYearRange === '5y' ? 'bg-[#470082] text-white' : 'text-[#470082] hover:bg-[#e6d0fa]'
                }`}
              >
                Últimos 5 Anos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Area / Bar Chart (Admissions vs Dismissals) */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#470082]">
            {activeYear
              ? `Admissões vs Demissões Mês a Mês (${activeYear})`
              : 'Evolução da Movimentação Anual (Admissões vs Demissões)'}
          </h3>
          <span className="text-xs font-semibold text-[#9f04d4] bg-[#faf6fd] px-3 py-1 rounded-full border border-[#f0d4fc]">
            {activeYear ? `Detalhamento de Jan a Dez (${activeYear})` : 'Clique em um ano no gráfico para detalhar'}
          </span>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeYear ? (
              /* Monthly Area/Bar Chart for active year */
              <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e4fb" />
                <XAxis dataKey="mesNome" stroke="#470082" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis stroke="#470082" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    Number(val).toLocaleString('pt-BR') + ' pessoas',
                    name === 'admissoes' ? 'Admissões' : 'Demissões'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #dcb8f7' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="admissoes" name="Admissões" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="demissoes" name="Demissões" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              /* Annual Area Chart with click to filter year */
              <AreaChart
                data={filteredYears}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const clickedAno = e.activePayload[0].payload.ano;
                    if (clickedAno) handleSelectYear(clickedAno);
                  }
                }}
              >
                <defs>
                  <linearGradient id="colorAdmissoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorDemissoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e4fb" />
                <XAxis dataKey="ano" stroke="#470082" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis stroke="#470082" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #dcb8f7', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Area type="monotone" dataKey="admissoes" name="Admissões" stroke="#0284c7" fillOpacity={1} fill="url(#colorAdmissoes)" strokeWidth={2.5} className="cursor-pointer" />
                <Area type="monotone" dataKey="demissoes" name="Demissões" stroke="#ef4444" fillOpacity={1} fill="url(#colorDemissoes)" strokeWidth={2.5} className="cursor-pointer" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Quick Year Selector Pills */}
        <div className="mt-3 pt-3 border-t border-[#f0e4fb] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#470082]">Selecione um ano para ver as parciais mensais:</span>
          <div className="flex flex-wrap gap-1">
            {yearList.slice(-10).map((y) => (
              <button
                key={y.ano}
                onClick={() => handleSelectYear(activeYear === y.ano ? null : y.ano)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeYear === y.ano
                    ? 'bg-[#470082] text-white shadow-xs'
                    : 'bg-[#faf6fd] text-[#470082] hover:bg-[#f0d4fc] border border-[#f0d4fc]'
                }`}
              >
                {y.ano}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Saldo Líquido (Admissões - Demissões) + Motivos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Saldo Líquido */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#470082] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#9f04d4]" />
                {activeYear
                  ? `Saldo Líquido Mês a Mês (${activeYear})`
                  : 'Saldo Líquido de Alocação por Ano (Admissões − Demissões)'}
              </h3>
              <p className="text-xs text-[#78549e]">
                {activeYear
                  ? `Projeção mensal de crescimento de equipe no ano ${activeYear}`
                  : 'Valores positivos indicam crescimento da equipe no ano'}
              </p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {activeYear ? (
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e4fb" />
                  <XAxis dataKey="mesNome" stroke="#470082" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis stroke="#470082" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(val: any) => [val > 0 ? `+${val}` : val, 'Saldo Líquido']}
                    contentStyle={{ borderRadius: '12px', borderColor: '#dcb8f7' }}
                  />
                  <Bar dataKey="saldo" name="Saldo Líquido Mês" fill="#470082" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart
                  data={filteredYears}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const clickedAno = e.activePayload[0].payload.ano;
                      if (clickedAno) handleSelectYear(clickedAno);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e4fb" />
                  <XAxis dataKey="ano" stroke="#470082" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#470082" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(val: any) => [val > 0 ? `+${val}` : val, 'Saldo Líquido']}
                    contentStyle={{ borderRadius: '12px', borderColor: '#dcb8f7' }}
                  />
                  <Bar dataKey="saldo" name="Saldo Líquido Anual" fill="#470082" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Motivos de Desligamento Ranking */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#470082] mb-1 flex items-center gap-2">
              <UserX className="w-5 h-5 text-[#ff27f9]" />
              Principais Motivos de Desligamento
            </h3>
            <p className="text-xs text-[#78549e] mb-4">
              {activeYear ? `Causas registradas em ${activeYear}` : 'Ranking de desligamentos por causa registrada'}
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {motivoList.slice(0, 7).map((item) => {
                const percent = Math.round((item.count / (totalDemissoesAteHoje || 1)) * 1000) / 10;
                return (
                  <div key={item.motivo} className="p-2.5 bg-[#faf6fd] rounded-xl border border-[#f0d4fc]">
                    <div className="flex items-center justify-between text-xs font-bold text-[#470082]">
                      <span className="truncate max-w-[180px]">{item.motivo}</span>
                      <span className="text-[#ff27f9]">{item.count.toLocaleString('pt-BR')} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-[#f0d4fc] h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-[#ff27f9] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f4ebfb] text-xs text-[#78549e]">
            Total de {totalDemissoesAteHoje.toLocaleString('pt-BR')} registros de desligamento no período.
          </div>
        </div>

      </div>

    </div>
  );
};
