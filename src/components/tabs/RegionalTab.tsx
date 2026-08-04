import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Funcionario } from '../../types';
import { getUFName } from '../../utils/dataParser';
import { MapPin, Building, Users } from 'lucide-react';

interface RegionalTabProps {
  data: Funcionario[];
  onSelectRegiao: (regiao: string) => void;
}

export const RegionalTab: React.FC<RegionalTabProps> = ({ data, onSelectRegiao }) => {
  // UF Aggregation
  const ufMap: { [uf: string]: { uf: string; total: number; ativos: number; desligados: number } } = {};
  // City Aggregation
  const cidadeMap: { [cidade: string]: { cidade: string; regiao: string; total: number; ativos: number; desligados: number } } = {};

  data.forEach((item) => {
    const uf = item.uf || 'SP';
    if (!ufMap[uf]) ufMap[uf] = { uf, total: 0, ativos: 0, desligados: 0 };
    ufMap[uf].total += 1;
    if (item.isAtivo) ufMap[uf].ativos += 1;
    else ufMap[uf].desligados += 1;

    const reg = item.regiao || 'Não Informado';
    if (!cidadeMap[reg]) cidadeMap[reg] = { cidade: item.cidade, regiao: reg, total: 0, ativos: 0, desligados: 0 };
    cidadeMap[reg].total += 1;
    if (item.isAtivo) cidadeMap[reg].ativos += 1;
    else cidadeMap[reg].desligados += 1;
  });

  const ufList = Object.values(ufMap).sort((a, b) => b.total - a.total);
  const cidadeList = Object.values(cidadeMap).sort((a, b) => b.total - a.total);

  const top15Cidades = cidadeList.slice(0, 15);

  const UF_COLORS = ['#470082', '#9f04d4', '#aa3ffe', '#c529ff', '#ff27f9', '#6404bc', '#c9f545'];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5]">
        <h2 className="text-xl font-extrabold text-[#470082] flex items-center gap-2 font-['Barlow']">
          <MapPin className="w-6 h-6 text-[#9f04d4]" />
          Distribuição Geográfica e Regional dos Alocados
        </h2>
        <p className="text-xs text-[#78549e] mt-1">
          Mapeamento dos profissionais por Estado (UF) e Cidade de alocação.
        </p>
      </div>

      {/* Grid: Top Estados vs Top Cidades Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* UF Distribution Donut/Cards */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5]">
          <h3 className="text-lg font-bold text-[#470082] mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-[#9f04d4]" />
            Alocações por Estado (UF)
          </h3>

          <div className="space-y-3">
            {ufList.map((item, idx) => {
              const percent = Math.round((item.total / (data.length || 1)) * 1000) / 10;
              const ufName = getUFName(item.uf);
              return (
                <div key={item.uf} className="p-3 bg-[#faf6fd] rounded-xl border border-[#f0d4fc] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-xl font-extrabold text-xs text-white flex items-center justify-center shadow-xs flex-shrink-0"
                      style={{ backgroundColor: UF_COLORS[idx % UF_COLORS.length] }}
                    >
                      {item.uf}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#470082]">{ufName} ({item.uf})</p>
                      <p className="text-[10px] text-[#78549e]">{item.ativos} Ativos / {item.desligados} Desligados</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-extrabold text-[#470082]">{item.total.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-[#9f04d4] font-bold">{percent}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 15 Cidades Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] lg:col-span-2">
          <h3 className="text-lg font-bold text-[#470082] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#9f04d4]" />
            Ranking das Top 15 Cidades / Regiões com Mais Alocados
          </h3>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top15Cidades} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e4fb" horizontal={false} />
                <XAxis type="number" stroke="#78549e" tick={{ fontSize: 11 }} />
                <YAxis dataKey="regiao" type="category" stroke="#470082" width={140} tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  formatter={(value: any) => [Number(value).toLocaleString('pt-BR') + ' alocados', 'Total']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #dcb8f7' }}
                />
                <Bar dataKey="total" fill="#470082" radius={[0, 6, 6, 0]}>
                  {top15Cidades.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#9f04d4' : index === 1 ? '#aa3ffe' : '#470082'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Complete City Table */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5]">
        <h3 className="text-lg font-bold text-[#470082] mb-4">
          Tabela Completa de Regiões / Cidades Alocadas ({cidadeList.length})
        </h3>

        <div className="overflow-x-auto rounded-xl border border-[#e8d8f5] max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#470082] text-white uppercase text-[11px] tracking-wider font-bold sticky top-0">
              <tr>
                <th className="p-3">Cidade - UF</th>
                <th className="p-3 text-center">Total Alocados</th>
                <th className="p-3 text-center">Ativos</th>
                <th className="p-3 text-center">Desligados</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0d4fc] bg-white">
              {cidadeList.slice(0, 50).map((c, idx) => (
                <tr key={c.regiao + '-' + idx} className="hover:bg-[#faf6fd] transition-colors">
                  <td className="p-3 font-bold text-[#470082]">
                    {c.regiao}
                  </td>
                  <td className="p-3 text-center font-extrabold text-[#9f04d4]">
                    {c.total.toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-center font-bold text-[#470082]">
                    {c.ativos}
                  </td>
                  <td className="p-3 text-center font-bold text-[#ff27f9]">
                    {c.desligados}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectRegiao(c.regiao)}
                      className="text-xs bg-[#f4ebfb] hover:bg-[#9f04d4] hover:text-white text-[#470082] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      Filtrar Região
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
