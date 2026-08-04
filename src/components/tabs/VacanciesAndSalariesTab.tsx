import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Funcionario } from '../../types';
import { formatCurrency, formatDate } from '../../utils/dataParser';
import { Award, DollarSign, Briefcase, TrendingUp, Search, ExternalLink } from 'lucide-react';

interface VacanciesAndSalariesTabProps {
  data: Funcionario[];
  onSelectWorker: (worker: Funcionario) => void;
  onSelectCargo: (cargo: string) => void;
}

export const VacanciesAndSalariesTab: React.FC<VacanciesAndSalariesTabProps> = ({
  data,
  onSelectWorker,
  onSelectCargo,
}) => {
  const [cargoSearch, setCargoSearch] = useState('');
  const [topSalariesStatusFilter, setTopSalariesStatusFilter] = useState<'all' | 'ativo' | 'desligado'>('all');

  // 1. Ranking da Quantidade de Vagas por Cargo / Tipo
  const cargoMap: {
    [cargo: string]: {
      cargo: string;
      totalVagas: number;
      ativos: number;
      desligados: number;
      somaSalarios: number;
      salarioMedio: number;
      maiorSalario: number;
    };
  } = {};

  data.forEach((item) => {
    const c = item.cargo || 'Não especificado';
    if (!cargoMap[c]) {
      cargoMap[c] = {
        cargo: c,
        totalVagas: 0,
        ativos: 0,
        desligados: 0,
        somaSalarios: 0,
        salarioMedio: 0,
        maiorSalario: 0,
      };
    }
    cargoMap[c].totalVagas += 1;
    if (item.isAtivo) cargoMap[c].ativos += 1;
    else cargoMap[c].desligados += 1;
    cargoMap[c].somaSalarios += item.salario;
    if (item.salario > cargoMap[c].maiorSalario) {
      cargoMap[c].maiorSalario = item.salario;
    }
  });

  const cargoList = Object.values(cargoMap)
    .map((c) => ({
      ...c,
      salarioMedio: c.totalVagas > 0 ? c.somaSalarios / c.totalVagas : 0,
    }))
    .sort((a, b) => b.totalVagas - a.totalVagas);

  const filteredCargoList = cargoList.filter((c) =>
    c.cargo.toLowerCase().includes(cargoSearch.toLowerCase())
  );

  const top15CargosBarChart = cargoList.slice(0, 15).map((c) => ({
    ...c,
    shortName: c.cargo.length > 20 ? c.cargo.substring(0, 20) + '...' : c.cargo,
  }));

  // 2. Ranking dos Maiores Salários
  const topSalariesData = data
    .filter((item) => {
      if (topSalariesStatusFilter === 'ativo') return item.isAtivo;
      if (topSalariesStatusFilter === 'desligado') return !item.isAtivo;
      return true;
    })
    .sort((a, b) => b.salario - a.salario)
    .slice(0, 15);

  // 3. Faixas Salariais
  const salaryRanges = [
    { label: 'Até R$ 2.000', min: 0, max: 2000, count: 0, color: '#aa3ffe' },
    { label: 'R$ 2.001 - R$ 4.000', min: 2001, max: 4000, count: 0, color: '#9f04d4' },
    { label: 'R$ 4.001 - R$ 8.000', min: 4001, max: 8000, count: 0, color: '#470082' },
    { label: 'R$ 8.001 - R$ 15.000', min: 8001, max: 15000, count: 0, color: '#c529ff' },
    { label: 'Acima de R$ 15.000', min: 15001, max: Infinity, count: 0, color: '#ff27f9' },
  ];

  data.forEach((item) => {
    const s = item.salario;
    const found = salaryRanges.find((r) => s >= r.min && s <= r.max);
    if (found) found.count += 1;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Section: Ranking Vagas Bar Chart + Faixas Salariais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top 15 Vagas Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#470082] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#9f04d4]" />
                Ranking dos Top 15 Cargos / Tipos de Vagas por Quantidade
              </h3>
              <p className="text-xs text-[#78549e]">Volumes de contratação por função alocada METARH</p>
            </div>
            <span className="text-xs font-bold text-[#470082] bg-[#c9f545] px-3 py-1 rounded-full">
              {cargoList.length} Cargos Mapeados
            </span>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top15CargosBarChart} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e4fb" horizontal={false} />
                <XAxis type="number" stroke="#78549e" tick={{ fontSize: 11 }} />
                <YAxis dataKey="shortName" type="category" stroke="#470082" width={150} tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [Number(value).toLocaleString('pt-BR'), name === 'totalVagas' ? 'Total Vagas' : name]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #dcb8f7' }}
                />
                <Bar dataKey="totalVagas" name="Total Vagas" fill="#9f04d4" radius={[0, 6, 6, 0]}>
                  {top15CargosBarChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#9f04d4' : '#470082'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Faixas Salariais Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#470082] mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#9f04d4]" />
              Distribuição por Faixa Salarial
            </h3>
            <p className="text-xs text-[#78549e] mb-5">Concentração de renda dos cargos alocados</p>

            <div className="space-y-4">
              {salaryRanges.map((range) => {
                const percent = Math.round((range.count / (data.length || 1)) * 1000) / 10;
                return (
                  <div key={range.label} className="p-3 bg-[#faf6fd] rounded-xl border border-[#f0d4fc]">
                    <div className="flex items-center justify-between text-xs font-bold text-[#470082] mb-1">
                      <span>{range.label}</span>
                      <span className="text-[#9f04d4]">{range.count.toLocaleString('pt-BR')} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-[#f0d4fc] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: range.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f4ebfb] text-xs text-[#78549e]">
            Análise baseada no campo <strong className="text-[#470082]">Salário Base</strong>.
          </div>
        </div>

      </div>

      {/* Middle Section: Ranking Maiores Salários */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#470082] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#ff27f9]" />
              Ranking dos Maiores Salários da Base
            </h3>
            <p className="text-xs text-[#78549e]">Listagem dos profissionais com maior remuneração cadastrada</p>
          </div>

          {/* Status Filter for Top Salaries */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f4ebfb] rounded-xl border border-[#e0c4f8]">
            <button
              onClick={() => setTopSalariesStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                topSalariesStatusFilter === 'all' ? 'bg-[#470082] text-white' : 'text-[#470082]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTopSalariesStatusFilter('ativo')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                topSalariesStatusFilter === 'ativo' ? 'bg-[#470082] text-[#c9f545]' : 'text-[#470082]'
              }`}
            >
              Apenas Ativos
            </button>
            <button
              onClick={() => setTopSalariesStatusFilter('desligado')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                topSalariesStatusFilter === 'desligado' ? 'bg-[#ff27f9] text-white' : 'text-[#470082]'
              }`}
            >
              Desligados
            </button>
          </div>
        </div>

        {/* Top Salaries Table */}
        <div className="overflow-x-auto rounded-xl border border-[#e8d8f5]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#470082] text-white uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="p-3"># Pos</th>
                <th className="p-3">Funcionário</th>
                <th className="p-3">Cargo / Função</th>
                <th className="p-3">Grupo Econômico</th>
                <th className="p-3">Cliente / Empresa</th>
                <th className="p-3">Cidade / UF</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Salário Base</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0d4fc] bg-white">
              {topSalariesData.map((worker, index) => (
                <tr key={worker.id + '-' + index} className="hover:bg-[#faf6fd] transition-colors">
                  <td className="p-3 font-extrabold text-[#9f04d4]">
                    #{index + 1}
                  </td>
                  <td className="p-3 font-bold text-[#470082]">
                    {worker.nome}
                  </td>
                  <td className="p-3 text-[#330066] font-medium">
                    {worker.cargo}
                  </td>
                  <td className="p-3 text-[#78549e] font-semibold">
                    {worker.grupoEconomico}
                  </td>
                  <td className="p-3 text-[#330066]">
                    {worker.nomeCliente}
                  </td>
                  <td className="p-3 text-[#78549e]">
                    {worker.regiao}
                  </td>
                  <td className="p-3">
                    {worker.isAtivo ? (
                      <span className="bg-[#c9f545] text-[#470082] font-bold text-[10px] px-2 py-0.5 rounded-full">
                        ATIVO
                      </span>
                    ) : (
                      <span className="bg-[#ff27f9]/20 text-[#ff27f9] font-bold text-[10px] px-2 py-0.5 rounded-full">
                        DESLIGADO
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-extrabold text-[#9f04d4] text-sm">
                    {formatCurrency(worker.salario)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectWorker(worker)}
                      className="p-1.5 text-[#9f04d4] hover:text-[#470082] hover:bg-[#f4ebfb] rounded-lg transition-all"
                      title="Ver Detalhes do Funcionário"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Complete Cargo Table with Search */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#470082]">
              Tabela Completa de Vagas e Salários Médios por Cargo
            </h3>
            <p className="text-xs text-[#78549e]">Pesquise e consulte métricas específicas por tipo de função</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9f04d4]" />
            <input
              type="text"
              placeholder="Filtrar por nome do cargo..."
              value={cargoSearch}
              onChange={(e) => setCargoSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#faf6fd] border border-[#dcb8f7] rounded-xl text-[#330066] focus:outline-none focus:ring-2 focus:ring-[#9f04d4]"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e8d8f5] max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4ebfb] text-[#470082] uppercase text-[11px] tracking-wider font-bold sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="p-3">Cargo / Função</th>
                <th className="p-3 text-center">Total Vagas</th>
                <th className="p-3 text-center">Ativos</th>
                <th className="p-3 text-center">Desligados</th>
                <th className="p-3 text-right">Salário Médio</th>
                <th className="p-3 text-right">Maior Salário</th>
                <th className="p-3 text-center">Filtrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0d4fc] bg-white">
              {filteredCargoList.slice(0, 50).map((c, idx) => (
                <tr key={c.cargo + '-' + idx} className="hover:bg-[#faf6fd] transition-colors">
                  <td className="p-3 font-bold text-[#470082]">
                    {c.cargo}
                  </td>
                  <td className="p-3 text-center font-extrabold text-[#9f04d4]">
                    {c.totalVagas.toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-center text-[#470082] font-semibold">
                    {c.ativos}
                  </td>
                  <td className="p-3 text-center text-[#ff27f9] font-semibold">
                    {c.desligados}
                  </td>
                  <td className="p-3 text-right font-extrabold text-[#470082]">
                    {formatCurrency(c.salarioMedio)}
                  </td>
                  <td className="p-3 text-right font-bold text-[#9f04d4]">
                    {formatCurrency(c.maiorSalario)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectCargo(c.cargo)}
                      className="text-xs bg-[#f4ebfb] hover:bg-[#9f04d4] hover:text-white text-[#470082] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      Filtrar Cargo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
