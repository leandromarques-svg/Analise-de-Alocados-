import React, { useState } from 'react';
import { Funcionario } from '../../types';
import { formatCurrency } from '../../utils/dataParser';
import { Building2, Search, ArrowUpDown, Filter, ChevronRight, Users, Wallet } from 'lucide-react';

interface EconomicGroupsTabProps {
  data: Funcionario[];
  onSelectGrupo: (grupo: string) => void;
}

export const EconomicGroupsTab: React.FC<EconomicGroupsTabProps> = ({
  data,
  onSelectGrupo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'ativos' | 'desligados' | 'salarioMedio' | 'folha'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Aggregation map by Grupo Econômico
  const grupoMap: {
    [grupo: string]: {
      grupo: string;
      total: number;
      ativos: number;
      desligados: number;
      somaSalarioAtivos: number;
      somaSalarioTotal: number;
      clientesSet: Set<string>;
      cargosSet: Set<string>;
    };
  } = {};

  data.forEach((item) => {
    const g = item.grupoEconomico || '00000-OUTROS';
    if (!grupoMap[g]) {
      grupoMap[g] = {
        grupo: g,
        total: 0,
        ativos: 0,
        desligados: 0,
        somaSalarioAtivos: 0,
        somaSalarioTotal: 0,
        clientesSet: new Set(),
        cargosSet: new Set(),
      };
    }
    grupoMap[g].total += 1;
    if (item.isAtivo) {
      grupoMap[g].ativos += 1;
      grupoMap[g].somaSalarioAtivos += item.salario;
    } else {
      grupoMap[g].desligados += 1;
    }
    grupoMap[g].somaSalarioTotal += item.salario;
    if (item.nomeCliente) grupoMap[g].clientesSet.add(item.nomeCliente);
    if (item.cargo) grupoMap[g].cargosSet.add(item.cargo);
  });

  const grupoList = Object.values(grupoMap).map((g) => {
    const retencao = Math.round((g.ativos / (g.total || 1)) * 1000) / 10;
    const salarioMedio = g.total > 0 ? g.somaSalarioTotal / g.total : 0;
    const salarioMedioAtivos = g.ativos > 0 ? g.somaSalarioAtivos / g.ativos : 0;
    return {
      ...g,
      retencao,
      salarioMedio,
      salarioMedioAtivos,
      folhaAtivos: g.somaSalarioAtivos,
      qtdClientes: g.clientesSet.size,
      qtdCargos: g.cargosSet.size,
    };
  });

  // Filter & Sort
  const filteredList = grupoList.filter(
    (g) =>
      g.grupo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Array.from(g.clientesSet).some((cli) => cli.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  filteredList.sort((a, b) => {
    let valA = 0;
    let valB = 0;
    if (sortBy === 'total') { valA = a.total; valB = b.total; }
    else if (sortBy === 'ativos') { valA = a.ativos; valB = b.ativos; }
    else if (sortBy === 'desligados') { valA = a.desligados; valB = b.desligados; }
    else if (sortBy === 'salarioMedio') { valA = a.salarioMedio; valB = b.salarioMedio; }
    else if (sortBy === 'folha') { valA = a.folhaAtivos; valB = b.folhaAtivos; }

    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#470082] flex items-center gap-2 font-['Barlow']">
            <Building2 className="w-6 h-6 text-[#9f04d4]" />
            Análise Consolidada de Grupos Econômicos ({grupoList.length})
          </h2>
          <p className="text-xs text-[#78549e] mt-1">
            Métricas detalhadas de alocação, taxa de retenção de ativos, folha salarial e salários médios por grupo.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9f04d4]" />
          <input
            type="text"
            placeholder="Buscar por nome do Grupo ou Cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-[#faf6fd] border border-[#dcb8f7] rounded-xl text-[#330066] focus:outline-none focus:ring-2 focus:ring-[#9f04d4]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-md border border-[#e8d8f5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#470082] text-white uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Grupo Econômico</th>
                <th className="p-4 text-center cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('total')}>
                  <div className="flex items-center justify-center gap-1">
                    Total Alocados <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('ativos')}>
                  <div className="flex items-center justify-center gap-1">
                    Ativos <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('desligados')}>
                  <div className="flex items-center justify-center gap-1">
                    Desligados <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-center">Taxa Retenção</th>
                <th className="p-4 text-right cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('salarioMedio')}>
                  <div className="flex items-center justify-end gap-1">
                    Salário Médio <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-right cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('folha')}>
                  <div className="flex items-center justify-end gap-1">
                    Folha Ativos <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0d4fc] bg-white">
              {filteredList.map((g, idx) => (
                <tr key={g.grupo + '-' + idx} className="hover:bg-[#faf6fd] transition-colors group">
                  <td className="p-4 font-bold text-[#470082]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#f4ebfb] text-[#9f04d4] font-bold text-xs flex items-center justify-center border border-[#e0c4f8]">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#470082] group-hover:text-[#9f04d4] transition-colors">
                          {g.grupo}
                        </p>
                        <p className="text-[10px] text-[#78549e]">
                          {g.qtdClientes} {g.qtdClientes === 1 ? 'Cliente' : 'Clientes'} / {g.qtdCargos} Cargos
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-center font-extrabold text-[#470082] text-sm">
                    {g.total.toLocaleString('pt-BR')}
                  </td>

                  <td className="p-4 text-center">
                    <span className="bg-[#c9f545] text-[#470082] font-bold px-2 py-0.5 rounded-full text-xs">
                      {g.ativos.toLocaleString('pt-BR')}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <span className="bg-[#ff27f9]/15 text-[#ff27f9] font-bold px-2 py-0.5 rounded-full text-xs">
                      {g.desligados.toLocaleString('pt-BR')}
                    </span>
                  </td>

                  <td className="p-4 text-center font-bold text-[#470082]">
                    <div className="w-full bg-[#f0d4fc] h-2 rounded-full overflow-hidden max-w-[80px] mx-auto mb-1">
                      <div
                        className="h-full bg-[#9f04d4] rounded-full"
                        style={{ width: `${g.retencao}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#78549e]">{g.retencao}%</span>
                  </td>

                  <td className="p-4 text-right font-extrabold text-[#9f04d4]">
                    {formatCurrency(g.salarioMedio)}
                  </td>

                  <td className="p-4 text-right font-extrabold text-[#470082]">
                    {formatCurrency(g.folhaAtivos)}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => onSelectGrupo(g.grupo)}
                      className="bg-[#9f04d4] hover:bg-[#470082] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <span>Filtrar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
