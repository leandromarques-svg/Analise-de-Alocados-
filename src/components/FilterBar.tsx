import React from 'react';
import { Search, Filter, X, RotateCcw, ChevronDown, Lock } from 'lucide-react';
import { FilterOptions, User } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface FilterBarProps {
  filters: FilterOptions;
  onChange: (newFilters: FilterOptions) => void;
  onReset: () => void;
  availableGrupos: string[];
  availableAnos: number[];
  availableRegioes: string[];
  availableUFs: string[];
  availableVinculos: string[];
  availableClientes: string[];
  availableCNPJs?: string[];
  availableComerciais?: string[];
  totalFilteredCount: number;
  totalUnfilteredCount: number;
  currentUser?: User | null;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onReset,
  availableGrupos,
  availableAnos,
  availableRegioes,
  availableUFs,
  availableVinculos,
  availableClientes,
  availableCNPJs = [],
  availableComerciais = [],
  totalFilteredCount,
  totalUnfilteredCount,
  currentUser,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const activeFiltersCount = [
    filters.status !== 'all',
    filters.grupoEconomico !== '',
    filters.vinculo !== '',
    filters.ano !== '',
    filters.regiao !== '',
    filters.uf !== '',
    filters.cliente !== '',
    filters.cnpj !== '',
    filters.comercial !== '',
    filters.cargo !== '',
    filters.searchQuery !== '',
  ].filter(Boolean).length;

  const handleStatusChange = (status: 'all' | 'ativo' | 'desligado') => {
    onChange({ ...filters, status });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-xs transition-all">
      
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Status Segmented Pill Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
          <button
            onClick={() => handleStatusChange('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filters.status === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({totalUnfilteredCount.toLocaleString('pt-BR')})
          </button>
          
          <button
            onClick={() => handleStatusChange('ativo')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              filters.status === 'ativo'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filters.status === 'ativo' ? 'bg-white' : 'bg-emerald-500'}`} />
            Ativos
          </button>

          <button
            onClick={() => handleStatusChange('desligado')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              filters.status === 'desligado'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filters.status === 'desligado' ? 'bg-white' : 'bg-rose-500'}`} />
            Desligados
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, cargo, grupo econômico, cliente, cidade..."
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#470082] focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle Advanced Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
              activeFiltersCount > 0 || isExpanded
                ? 'bg-[#470082] text-white border-[#470082]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="bg-[#c9f545] text-[#470082] text-[10px] font-extrabold px-1.5 py-0.2 rounded-md">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={onReset}
              className="p-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Stats Summary */}
      <div className="mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
        <span>
          Exibindo <strong className="text-slate-800">{totalFilteredCount.toLocaleString('pt-BR')}</strong> de {totalUnfilteredCount.toLocaleString('pt-BR')} colaboradores
        </span>
        {activeFiltersCount > 0 && (
          <span className="text-[#470082] font-semibold text-[11px]">
            {activeFiltersCount} filtro(s) ativo(s)
          </span>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
          
          {/* Grupo Econômico Select */}
          {currentUser?.role === 'Cliente' && currentUser.grupoEconomico ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                Grupo Econômico <Lock className="w-3 h-3 text-[#401669]" />
              </label>
              <div className="w-full text-xs bg-purple-50/80 border border-purple-200 rounded-lg p-2.5 text-purple-900 font-bold flex items-center justify-between cursor-not-allowed">
                <span className="truncate">{currentUser.grupoEconomico}</span>
                <span className="text-[9px] uppercase font-bold tracking-wider bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded flex-shrink-0">
                  Fixo (Cliente)
                </span>
              </div>
            </div>
          ) : (
            <SearchableSelect
              label="Grupo Econômico"
              value={filters.grupoEconomico}
              onChange={(val) => onChange({ ...filters, grupoEconomico: val })}
              options={availableGrupos}
              allLabel="Todos os Grupos"
              placeholder="Buscar grupo..."
            />
          )}

          {/* Ano (Admissão / Demissão) */}
          <SearchableSelect
            label="Ano de Admissão / Evento"
            value={filters.ano}
            onChange={(val) => onChange({ ...filters, ano: val })}
            options={availableAnos.map(String)}
            allLabel="Todos os Anos"
            placeholder="Buscar ano..."
          />

          {/* Região / Cidade */}
          <SearchableSelect
            label="Região / Cidade"
            value={filters.regiao}
            onChange={(val) => onChange({ ...filters, regiao: val })}
            options={availableRegioes}
            allLabel="Todas as Regiões"
            placeholder="Buscar região/cidade..."
          />

          {/* Estado (UF) */}
          <SearchableSelect
            label="Estado (UF)"
            value={filters.uf}
            onChange={(val) => onChange({ ...filters, uf: val })}
            options={availableUFs}
            allLabel="Todos os Estados (UF)"
            placeholder="Buscar estado..."
          />

          {/* Vínculo Empregatício */}
          <SearchableSelect
            label="Vínculo Empregatício"
            value={filters.vinculo}
            onChange={(val) => onChange({ ...filters, vinculo: val })}
            options={availableVinculos}
            allLabel="Todos os Vínculos"
            placeholder="Buscar vínculo..."
          />

          {/* Nome Cliente / Empresa */}
          <SearchableSelect
            label="Empresa / Cliente"
            value={filters.cliente}
            onChange={(val) => onChange({ ...filters, cliente: val })}
            options={availableClientes}
            allLabel="Todos os Clientes"
            placeholder="Buscar cliente..."
          />

          {/* CNPJ do Cliente */}
          <SearchableSelect
            label="CNPJ do Cliente"
            value={filters.cnpj}
            onChange={(val) => onChange({ ...filters, cnpj: val })}
            options={availableCNPJs}
            allLabel="Todos os CNPJs"
            placeholder="Buscar CNPJ..."
          />

          {/* Atendimento Comercial */}
          <SearchableSelect
            label="Atendimento Comercial"
            value={filters.comercial}
            onChange={(val) => onChange({ ...filters, comercial: val })}
            options={availableComerciais}
            allLabel="Todos os Executivos"
            placeholder="Buscar comercial..."
          />

          {/* Quick Clear Button */}
          <div className="flex items-end sm:col-span-2 lg:col-span-4 justify-end pt-1">
            <button
              onClick={onReset}
              className="py-2 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold text-xs rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Resetar Filtros
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

