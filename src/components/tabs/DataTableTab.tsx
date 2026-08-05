import React, { useState, useMemo } from 'react';
import { Funcionario } from '../../types';
import { formatCurrency, formatDate, parseDateDetails, isFutureAdmission } from '../../utils/dataParser';
import { Search, ChevronLeft, ChevronRight, Eye, FileSpreadsheet, ArrowUpDown, Calendar, CalendarDays } from 'lucide-react';

interface DataTableTabProps {
  data: Funcionario[];
  onSelectWorker: (worker: Funcionario) => void;
  onExportCSV: () => void;
}

function parseDateToTimestamp(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const details = parseDateDetails(dateStr);
  return details.date ? details.date.getTime() : 0;
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
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'desligados'>('todos');

  // Filter local search & status
  const filteredData = useMemo(() => {
    let result = data;

    if (statusFilter === 'ativos') {
      result = result.filter((w) => w.isAtivo);
    } else if (statusFilter === 'desligados') {
      result = result.filter((w) => !w.isAtivo);
    }

    if (!tableSearch.trim()) return result;
    const q = tableSearch.toLowerCase();
    return result.filter(
      (w) =>
        w.nome.toLowerCase().includes(q) ||
        w.cargo.toLowerCase().includes(q) ||
        w.grupoEconomico.toLowerCase().includes(q) ||
        w.nomeCliente.toLowerCase().includes(q) ||
        w.regiao.toLowerCase().includes(q) ||
        w.cidade.toLowerCase().includes(q) ||
        String(w.id).includes(q)
    );
  }, [data, tableSearch, statusFilter]);

  // Sort with special date parsing
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      // Date handling
      if (sortField === 'dataAdmissao' || sortField === 'dataDemissao') {
        const tsA = parseDateToTimestamp(a[sortField] as string);
        const tsB = parseDateToTimestamp(b[sortField] as string);
        return sortDirection === 'asc' ? tsA - tsB : tsB - tsA;
      }

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
      // Default to descending for dates so newest dates come first on first click
      if (field === 'dataAdmissao' || field === 'dataDemissao') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
    setCurrentPage(1);
  };

  // Helper function for quick date order selection from dropdown
  const handleQuickDateSort = (preset: string) => {
    if (preset === 'admissao-asc') {
      setSortField('dataAdmissao');
      setSortDirection('asc');
    } else if (preset === 'admissao-desc') {
      setSortField('dataAdmissao');
      setSortDirection('desc');
    } else if (preset === 'demissao-desc') {
      setSortField('dataDemissao');
      setSortDirection('desc');
    } else if (preset === 'demissao-asc') {
      setSortField('dataDemissao');
      setSortDirection('asc');
    } else if (preset === 'nome-asc') {
      setSortField('nome');
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortOptionValue = () => {
    if (sortField === 'dataAdmissao' && sortDirection === 'asc') return 'admissao-asc';
    if (sortField === 'dataAdmissao' && sortDirection === 'desc') return 'admissao-desc';
    if (sortField === 'dataDemissao' && sortDirection === 'desc') return 'demissao-desc';
    if (sortField === 'dataDemissao' && sortDirection === 'asc') return 'demissao-asc';
    if (sortField === 'nome' && sortDirection === 'asc') return 'nome-asc';
    return 'custom';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Table Controls Header */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-[#e8d8f5] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#470082] font-['Barlow']">
            Tabela Geral de Funcionários Alocados ({sortedData.length.toLocaleString('pt-BR')})
          </h2>
          <p className="text-xs text-[#78549e] mt-0.5">
            Consulte a lista detalhada de colaboradores ativos e desligados. Clique nos cabeçalhos ou use a ordenação por data para organizar da primeira para a última.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Filter Toggle */}
          <div className="flex items-center bg-[#faf6fd] p-1 rounded-xl border border-[#dcb8f7]">
            <button
              onClick={() => { setStatusFilter('todos'); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'todos' ? 'bg-[#470082] text-white shadow-2xs' : 'text-[#78549e] hover:text-[#470082]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setStatusFilter('ativos'); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ativos' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-[#78549e] hover:text-emerald-700'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => { setStatusFilter('desligados'); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'desligados' ? 'bg-rose-600 text-white shadow-2xs' : 'text-[#78549e] hover:text-rose-700'
              }`}
            >
              Desligados
            </button>
          </div>

          {/* Quick Date / Field Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#faf6fd] px-3 py-1.5 rounded-xl border border-[#dcb8f7]">
            <CalendarDays className="w-4 h-4 text-[#9f04d4]" />
            <select
              value={getSortOptionValue()}
              onChange={(e) => handleQuickDateSort(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#470082] focus:outline-none cursor-pointer"
            >
              <option value="nome-asc">Nome (A-Z)</option>
              <option value="admissao-asc">Admissão: Primeira para Última (Antiga → Recente) ⏳</option>
              <option value="admissao-desc">Admissão: Última para Primeira (Recente → Antiga) ⚡</option>
              <option value="demissao-desc">Demissão: Mais Recentes Primeiro ⚡</option>
              <option value="demissao-asc">Demissão: Mais Antigas Primeiro ⏳</option>
              {getSortOptionValue() === 'custom' && (
                <option value="custom">Outra ordenação ativa ({String(sortField)})</option>
              )}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9f04d4]" />
            <input
              type="text"
              placeholder="Buscar por nome, cargo, cidade..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#faf6fd] border border-[#dcb8f7] rounded-xl text-[#330066] focus:ring-2 focus:ring-[#9f04d4] focus:outline-none"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={onExportCSV}
            className="bg-[#c9f545] hover:bg-[#d8fc62] text-[#470082] font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer flex-shrink-0"
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
                  <div className="flex items-center gap-1">
                    Nome do Funcionário
                    {sortField === 'nome' && <span className="text-[#c9f545] font-black">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    {sortField !== 'nome' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
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
                
                {/* Data Admissão Header with Active Sorting Indicator */}
                <th
                  className={`p-3.5 text-center cursor-pointer transition-colors ${
                    sortField === 'dataAdmissao' ? 'bg-[#6404bc] text-[#c9f545]' : 'hover:bg-[#6404bc]'
                  }`}
                  onClick={() => handleSort('dataAdmissao')}
                  title="Clique para ordenar da primeira para a última data de admissão (ou vice-versa)"
                >
                  <div className="flex items-center justify-center gap-1 font-extrabold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Data Admissão</span>
                    {sortField === 'dataAdmissao' ? (
                      <span className="bg-[#c9f545] text-[#470082] text-[10px] px-1 py-0.2 rounded font-black">
                        {sortDirection === 'asc' ? '1ª → Última' : 'Última → 1ª'}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </div>
                </th>

                {/* Data Demissão Header with Active Sorting Indicator */}
                <th
                  className={`p-3.5 text-center cursor-pointer transition-colors ${
                    sortField === 'dataDemissao' ? 'bg-[#6404bc] text-[#c9f545]' : 'hover:bg-[#6404bc]'
                  }`}
                  onClick={() => handleSort('dataDemissao')}
                  title="Clique para ordenar da primeira para a última data de demissão (ou vice-versa)"
                >
                  <div className="flex items-center justify-center gap-1 font-extrabold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Data Demissão</span>
                    {sortField === 'dataDemissao' ? (
                      <span className="bg-[#c9f545] text-[#470082] text-[10px] px-1 py-0.2 rounded font-black">
                        {sortDirection === 'asc' ? '1ª → Última' : 'Última → 1ª'}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </div>
                </th>

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
                    <td className="p-3.5 text-center text-[#470082] font-bold">
                      <div className="flex flex-col items-center justify-center">
                        <span>{formatDate(worker.dataAdmissao)}</span>
                        {isFutureAdmission(worker.dataAdmissao) && (
                          <span className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title="Data posterior a Agosto/2026 (Mês Atual)">
                            ⚠️ Data Futura
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-center text-[#ff27f9] font-bold">
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
              className="bg-white border border-[#dcb8f7] rounded-lg px-2 py-1 text-[#470082] font-bold focus:outline-none cursor-pointer"
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
