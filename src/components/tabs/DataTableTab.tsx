import React, { useState, useMemo } from 'react';
import { Funcionario } from '../../types';
import { formatCurrency, formatDate } from '../../utils/dataParser';
import { Search, ChevronLeft, ChevronRight, Eye, FileSpreadsheet, ArrowUpDown, Filter } from 'lucide-react';

interface DataTableTabProps {
  data: Funcionario[];
  onSelectWorker: (worker: Funcionario) => void;
  onExportCSV: () => void;
}

export const DataTableTab: React.FC<DataTableTabProps> = ({
  data,
  onSelectWorker,
  onExportCSV,
}) => {
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<keyof Funcionario>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter local search
  const filteredData = useMemo(() => {
    if (!tableSearch.trim()) return data;
    const q = tableSearch.toLowerCase();
    return data.filter(
      (w) =>
        w.nome.toLowerCase().includes(q) ||
        w.cargo.toLowerCase().includes(q) ||
        w.grupoEconomico.toLowerCase().includes(q) ||
        w.nomeCliente.toLowerCase().includes(q) ||
        w.regiao.toLowerCase().includes(q) ||
        String(w.id).includes(q)
    );
  }, [data, tableSearch]);

  // Sort
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field: keyof Funcionario) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Table Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#470082] font-['Barlow']">
            Tabela Geral de Funcionários Alocados ({sortedData.length.toLocaleString('pt-BR')})
          </h2>
          <p className="text-xs text-[#78549e] mt-0.5">
            Consulte a lista detalhada de colaboradores ativos e desligados com suporte a ordenação e busca rápida.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9f04d4]" />
            <input
              type="text"
              placeholder="Buscar na tabela..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#faf6fd] border border-[#dcb8f7] rounded-xl text-[#330066] focus:ring-2 focus:ring-[#9f04d4] focus:outline-none"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={onExportCSV}
            className="bg-[#c9f545] hover:bg-[#d8fc62] text-[#470082] font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-md border border-[#e8d8f5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#470082] text-white uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="p-3.5 cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">Cód. <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('nome')}>
                  <div className="flex items-center gap-1">Nome do Funcionário <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('isAtivo')}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('cargo')}>
                  <div className="flex items-center gap-1">Cargo / Função <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('grupoEconomico')}>
                  <div className="flex items-center gap-1">Grupo Econômico <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('nomeCliente')}>
                  <div className="flex items-center gap-1">Cliente / Empresa <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5">Região</th>
                <th className="p-3.5 text-right cursor-pointer hover:bg-[#6404bc]" onClick={() => handleSort('salario')}>
                  <div className="flex items-center justify-end gap-1">Salário <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5 text-center">Data Admissão</th>
                <th className="p-3.5 text-center">Data Demissão</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0d4fc] bg-white">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[#78549e] font-semibold">
                    Nenhum funcionário encontrado com os parâmetros de pesquisa aplicados.
                  </td>
                </tr>
              ) : (
                paginatedData.map((worker) => (
                  <tr key={worker.id} className="hover:bg-[#faf6fd] transition-colors">
                    <td className="p-3.5 font-bold text-[#9f04d4]">
                      #{worker.id}
                    </td>
                    <td className="p-3.5 font-bold text-[#470082]">
                      {worker.nome}
                    </td>
                    <td className="p-3.5">
                      {worker.isAtivo ? (
                        <span className="bg-[#c9f545] text-[#470082] font-bold text-[10px] px-2.5 py-1 rounded-full border border-[#b5e036]">
                          ATIVO
                        </span>
                      ) : (
                        <span className="bg-[#ff27f9]/20 text-[#ff27f9] font-bold text-[10px] px-2.5 py-1 rounded-full border border-[#ff27f9]/40">
                          DESLIGADO
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-[#330066] font-medium">
                      {worker.cargo}
                    </td>
                    <td className="p-3.5 text-[#78549e] font-semibold">
                      {worker.grupoEconomico}
                    </td>
                    <td className="p-3.5 text-[#330066]">
                      {worker.nomeCliente}
                    </td>
                    <td className="p-3.5 text-[#78549e]">
                      {worker.regiao}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-[#9f04d4]">
                      {formatCurrency(worker.salario)}
                    </td>
                    <td className="p-3.5 text-center text-[#78549e]">
                      {formatDate(worker.dataAdmissao)}
                    </td>
                    <td className="p-3.5 text-center text-[#ff27f9] font-semibold">
                      {worker.isAtivo ? '-' : formatDate(worker.dataDemissao)}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onSelectWorker(worker)}
                        className="p-1.5 text-[#9f04d4] hover:text-white hover:bg-[#9f04d4] rounded-lg transition-all cursor-pointer"
                        title="Ver Detalhes do Alocado"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-[#faf6fd] border-t border-[#f0d4fc] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78549e]">
          
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <span>Exibir</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-[#dcb8f7] rounded-lg px-2 py-1 text-[#470082] font-bold focus:outline-none"
            >
              <option value={15}>15 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
            <span>linhas</span>
          </div>

          {/* Page Navigator */}
          <div className="flex items-center gap-3">
            <span>
              Página <strong className="text-[#470082]">{currentPage}</strong> de <strong className="text-[#470082]">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-[#dcb8f7] bg-white text-[#470082] disabled:opacity-40 hover:bg-[#f4ebfb] transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-[#dcb8f7] bg-white text-[#470082] disabled:opacity-40 hover:bg-[#f4ebfb] transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
