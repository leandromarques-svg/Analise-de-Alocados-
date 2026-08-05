import React, { useState, useMemo } from 'react';
import { Funcionario } from '../../types';
import {
  UserCheck, Search, Filter, Briefcase, Building2, MapPin, Calendar, Star,
  UserX, CheckSquare, Square, Download, Trash2, CheckCircle2, ArrowUpDown,
  Clock, FileText
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/dataParser';
import { MultiSearchableSelect } from '../MultiSearchableSelect';

interface TalentBankTabProps {
  data: Funcionario[];
  onSelectWorker: (worker: Funcionario) => void;
}

function getDemissaoTimestamp(dateStr: string | null): number {
  if (!dateStr) return 0;
  const str = String(dateStr).trim();
  if (!str) return 0;

  // Try ISO parsing
  const parsedIso = Date.parse(str);
  if (!isNaN(parsedIso)) return parsedIso;

  // Try DD/MM/YYYY parsing
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  return 0;
}

export const TalentBankTab: React.FC<TalentBankTabProps> = ({
  data,
  onSelectWorker,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCargos, setSelectedCargos] = useState<string[]>([]);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  const [selectedCidades, setSelectedCidades] = useState<string[]>([]);
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([]);
  const [selectedMotivos, setSelectedMotivos] = useState<string[]>([]);
  
  // Date filters
  const [datePreset, setDatePreset] = useState<'all' | '30' | '90' | '180' | '365'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recente' | 'antigo' | 'nome'>('recente');

  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [selectedTalentIds, setSelectedTalentIds] = useState<Set<string>>(new Set());

  // Filter only inactive / desligados employees
  const inactiveWorkers = useMemo(() => {
    return data.filter((w) => !w.isAtivo || w.dataDemissao || w.status === 'desligado');
  }, [data]);

  // Derived filter options
  const cargoOptions = useMemo(() => {
    const set = new Set<string>();
    inactiveWorkers.forEach((w) => {
      if (w.cargo) set.add(w.cargo);
    });
    return Array.from(set).sort();
  }, [inactiveWorkers]);

  const grupoOptions = useMemo(() => {
    const set = new Set<string>();
    inactiveWorkers.forEach((w) => {
      if (w.grupoEconomico) set.add(w.grupoEconomico);
    });
    return Array.from(set).sort();
  }, [inactiveWorkers]);

  const cidadeOptions = useMemo(() => {
    const set = new Set<string>();
    inactiveWorkers.forEach((w) => {
      if (w.cidade && w.cidade !== 'Não informada') set.add(w.cidade);
    });
    return Array.from(set).sort();
  }, [inactiveWorkers]);

  const localidadeOptions = useMemo(() => {
    const set = new Set<string>();
    inactiveWorkers.forEach((w) => {
      if (w.regiao) set.add(w.regiao);
      else if (w.uf) set.add(w.uf);
    });
    return Array.from(set).sort();
  }, [inactiveWorkers]);

  const motivoOptions = useMemo(() => {
    const set = new Set<string>();
    inactiveWorkers.forEach((w) => {
      if (w.motivoDesligamento && w.motivoDesligamento !== '-') {
        set.add(w.motivoDesligamento);
      }
    });
    return Array.from(set).sort();
  }, [inactiveWorkers]);

  // Filtered & Sorted workers
  const filteredTalents = useMemo(() => {
    // Reference timestamp for presets (max demissao date in dataset or Date.now())
    let maxTs = 0;
    inactiveWorkers.forEach((w) => {
      const ts = getDemissaoTimestamp(w.dataDemissao);
      if (ts > maxTs) maxTs = ts;
    });
    const refNow = maxTs > 0 ? maxTs : Date.now();

    return inactiveWorkers
      .filter((w) => {
        const matchSearch =
          searchTerm === '' ||
          w.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.grupoEconomico.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.regiao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.motivoDesligamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase());

        const matchCargo = selectedCargos.length === 0 || selectedCargos.includes(w.cargo);
        const matchGrupo = selectedGrupos.length === 0 || selectedGrupos.includes(w.grupoEconomico);
        const matchCidade = selectedCidades.length === 0 || selectedCidades.includes(w.cidade);
        const matchLocalidade =
          selectedLocalidades.length === 0 ||
          selectedLocalidades.includes(w.regiao) ||
          selectedLocalidades.includes(w.uf);
        const matchMotivo =
          selectedMotivos.length === 0 || selectedMotivos.includes(w.motivoDesligamento);

        // Date range filtering
        let matchDate = true;
        const demTs = getDemissaoTimestamp(w.dataDemissao);

        if (datePreset === '30') {
          const ms = 30 * 24 * 60 * 60 * 1000;
          matchDate = demTs >= refNow - ms;
        } else if (datePreset === '90') {
          const ms = 90 * 24 * 60 * 60 * 1000;
          matchDate = demTs >= refNow - ms;
        } else if (datePreset === '180') {
          const ms = 180 * 24 * 60 * 60 * 1000;
          matchDate = demTs >= refNow - ms;
        } else if (datePreset === '365') {
          const ms = 365 * 24 * 60 * 60 * 1000;
          matchDate = demTs >= refNow - ms;
        }

        if (startDate) {
          const startTs = new Date(startDate + 'T00:00:00').getTime();
          if (!isNaN(startTs) && demTs < startTs) matchDate = false;
        }
        if (endDate) {
          const endTs = new Date(endDate + 'T23:59:59').getTime();
          if (!isNaN(endTs) && demTs > endTs) matchDate = false;
        }

        return (
          matchSearch &&
          matchCargo &&
          matchGrupo &&
          matchCidade &&
          matchLocalidade &&
          matchMotivo &&
          matchDate
        );
      })
      .sort((a, b) => {
        if (sortBy === 'recente') {
          return getDemissaoTimestamp(b.dataDemissao) - getDemissaoTimestamp(a.dataDemissao);
        }
        if (sortBy === 'antigo') {
          return getDemissaoTimestamp(a.dataDemissao) - getDemissaoTimestamp(b.dataDemissao);
        }
        if (sortBy === 'nome') {
          return a.nome.localeCompare(b.nome);
        }
        return 0;
      });
  }, [
    inactiveWorkers,
    searchTerm,
    selectedCargos,
    selectedGrupos,
    selectedCidades,
    selectedLocalidades,
    selectedMotivos,
    datePreset,
    startDate,
    endDate,
    sortBy,
  ]);

  // Selection handlers
  const toggleSelectTalent = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTalentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedTalentIds((prev) => {
      const next = new Set(prev);
      filteredTalents.slice(0, 100).forEach((w) => next.add(w.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedTalentIds(new Set());
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCargos([]);
    setSelectedGrupos([]);
    setSelectedCidades([]);
    setSelectedLocalidades([]);
    setSelectedMotivos([]);
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('recente');
  };

  // Export selected or filtered talents to CSV
  const handleExportCSV = () => {
    const listToExport = selectedTalentIds.size > 0
      ? inactiveWorkers.filter((w) => selectedTalentIds.has(w.id))
      : filteredTalents;

    if (listToExport.length === 0) return;

    const headers = [
      'Código',
      'Nome do Profissional',
      'Cargo',
      'Grupo Econômico',
      'Empresa',
      'Cliente',
      'Região / Localidade',
      'Cidade',
      'UF',
      'Data Admissão',
      'Data Desligamento',
      'Motivo Desligamento',
      'Telefone / Celular',
      'E-mail',
      'Salário Base (R$)'
    ];

    const rows = listToExport.map((w) => [
      `"${w.id}"`,
      `"${(w.nome || '').replace(/"/g, '""')}"`,
      `"${(w.cargo || '').replace(/"/g, '""')}"`,
      `"${(w.grupoEconomico || '').replace(/"/g, '""')}"`,
      `"${(w.empresa || '').replace(/"/g, '""')}"`,
      `"${(w.nomeCliente || '').replace(/"/g, '""')}"`,
      `"${(w.regiao || '').replace(/"/g, '""')}"`,
      `"${(w.cidade || '').replace(/"/g, '""')}"`,
      `"${(w.uf || '').replace(/"/g, '""')}"`,
      `"${w.dataAdmissao || ''}"`,
      `"${w.dataDemissao || ''}"`,
      `"${(w.motivoDesligamento || '').replace(/"/g, '""')}"`,
      `"${w.celular || w.telefone || ''}"`,
      `"${w.emailCorporativo || ''}"`,
      `"${w.salario || 0}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Banco_de_Talentos_METARH_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedCargos.length > 0 ||
    selectedGrupos.length > 0 ||
    selectedCidades.length > 0 ||
    selectedLocalidades.length > 0 ||
    selectedMotivos.length > 0 ||
    datePreset !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#401669] to-purple-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-800/80 text-purple-200 text-xs px-3 py-1 rounded-full font-semibold border border-purple-700/50 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Gestão de Recrutamento & Qualificação
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Banco de Talentos METARH</h2>
            <p className="text-xs md:text-sm text-purple-200 mt-1 max-w-2xl">
              Catálogo inteligente de ex-colaboradores e profissionais desligados com histórico validado para reaproveitamento em novas vagas e processos seletivos.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20 flex-shrink-0">
            <UserX className="w-8 h-8 text-purple-300" />
            <div>
              <p className="text-2xl font-extrabold">{inactiveWorkers.length.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold">Talentos Inativos Registrados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col space-y-4">
        
        {/* Row 1: Search Input + Sort Select */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, cargo, grupo, cidade, motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#401669] focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#401669]" /> Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#401669] cursor-pointer"
            >
              <option value="recente">Mais Recentes Primeiro ⚡</option>
              <option value="antigo">Mais Antigos Primeiro</option>
              <option value="nome">Nome A-Z</option>
            </select>
          </div>
        </div>

        {/* Row 2: Multi-Searchable Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <MultiSearchableSelect
            label="Cargo / Função"
            selectedValues={selectedCargos}
            onChange={(vals) => setSelectedCargos(vals)}
            options={cargoOptions}
            allLabel="Todos os Cargos"
            placeholder="Buscar cargo..."
          />

          <MultiSearchableSelect
            label="Grupo Econômico"
            selectedValues={selectedGrupos}
            onChange={(vals) => setSelectedGrupos(vals)}
            options={grupoOptions}
            allLabel="Todos os Grupos"
            placeholder="Buscar grupo..."
          />

          <MultiSearchableSelect
            label="Cidade"
            selectedValues={selectedCidades}
            onChange={(vals) => setSelectedCidades(vals)}
            options={cidadeOptions}
            allLabel="Todas as Cidades"
            placeholder="Buscar cidade..."
          />

          <MultiSearchableSelect
            label="Localidade (Região / UF)"
            selectedValues={selectedLocalidades}
            onChange={(vals) => setSelectedLocalidades(vals)}
            options={localidadeOptions}
            allLabel="Todas as Regiões"
            placeholder="Buscar região/UF..."
          />

          <MultiSearchableSelect
            label="Motivo do Desligamento"
            selectedValues={selectedMotivos}
            onChange={(vals) => setSelectedMotivos(vals)}
            options={motivoOptions}
            allLabel="Todos os Motivos"
            placeholder="Buscar motivo..."
          />
        </div>

        {/* Row 3: Date Filter Controls */}
        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#401669] flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Desligamento:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: '30', label: 'Últimos 30 dias' },
              { id: '90', label: 'Últimos 90 dias' },
              { id: '180', label: 'Últimos 180 dias' },
              { id: '365', label: 'Último 1 ano' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id as any)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-[#401669] text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="font-semibold">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (datePreset !== 'all') setDatePreset('all');
                }}
                className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#401669]"
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="font-semibold">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (datePreset !== 'all') setDatePreset('all');
                }}
                className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#401669]"
              />
            </div>
          </div>

        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500 font-medium">
              Exibindo <strong className="text-slate-800">{filteredTalents.length}</strong> de {inactiveWorkers.length} talentos inativos.
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 cursor-pointer underline"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        )}
      </div>

      {/* Selection & Export Action Bar */}
      <div className="bg-[#401669] text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-purple-800/80 px-3 py-1.5 rounded-lg border border-purple-700/60 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#c9f545]" />
            <span>{selectedTalentIds.size} talentos selecionados</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={selectAllVisible}
              className="text-purple-200 hover:text-white underline cursor-pointer font-medium"
            >
              Selecionar exibidos ({Math.min(filteredTalents.length, 100)})
            </button>
            {selectedTalentIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-rose-300 hover:text-rose-100 underline cursor-pointer font-medium"
              >
                Desmarcar todos
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#c9f545] text-[#401669] hover:bg-lime-400 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>
            {selectedTalentIds.size > 0
              ? `Baixar Selecionados em CSV (${selectedTalentIds.size})`
              : `Baixar Lista Filtrada em CSV (${filteredTalents.length})`}
          </span>
        </button>
      </div>

      {/* Cards Grid */}
      {filteredTalents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Nenhum talento encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">Tente ajustar seus termos de busca ou filtros de seleção.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTalents.slice(0, 90).map((worker) => {
            const isStarred = favoritedIds.has(String(worker.id));
            const isSelected = selectedTalentIds.has(String(worker.id));

            return (
              <div
                key={worker.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group relative ${
                  isSelected
                    ? 'border-[#401669] ring-2 ring-[#401669]/20 bg-purple-50/20'
                    : 'border-slate-200/80 hover:shadow-md hover:border-purple-300'
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox + Avatar + Star */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => toggleSelectTalent(String(worker.id), e)}
                        className={`p-1 rounded-md transition-colors cursor-pointer mt-0.5 ${
                          isSelected ? 'text-[#401669]' : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={isSelected ? 'Desmarcar profissional' : 'Selecionar profissional para lista'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 fill-[#401669] text-white" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#401669] flex items-center justify-center font-bold text-xs border border-purple-200 flex-shrink-0">
                        {worker.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>

                      <div className="min-w-0">
                        <h4
                          onClick={() => onSelectWorker(worker)}
                          className="text-sm font-bold text-slate-800 group-hover:text-[#401669] transition-colors line-clamp-1 hover:underline cursor-pointer"
                        >
                          {worker.nome}
                        </h4>

                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 rounded-md">
                            Desligado em {formatDate(worker.dataDemissao)}
                          </span>

                          {worker.motivoDesligamento && worker.motivoDesligamento !== '-' && (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 rounded-md line-clamp-1" title={`Motivo: ${worker.motivoDesligamento}`}>
                              {worker.motivoDesligamento}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => toggleFavorite(String(worker.id), e)}
                      title={isStarred ? 'Remover dos favoritos' : 'Salvar para novo processo'}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                        isStarred
                          ? 'bg-amber-50 text-amber-500 border-amber-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Worker Information Body */}
                  <div
                    onClick={() => onSelectWorker(worker)}
                    className="space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100 mb-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-[#401669] flex-shrink-0" />
                      <span className="font-semibold text-slate-800 line-clamp-1">{worker.cargo}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="line-clamp-1">{worker.grupoEconomico || 'Grupo Não Especificado'}</span>
                    </div>

                    {/* Cidade e Localidade/Região Separadas */}
                    <div className="flex flex-col space-y-1 text-[11px] pt-2 border-t border-slate-200/60 text-slate-500">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <MapPin className="w-3 h-3 text-[#401669] flex-shrink-0" />
                          <strong className="text-slate-800">{worker.cidade || 'Cidade N/I'}</strong>
                          {worker.uf && <span className="text-slate-500 font-semibold">({worker.uf})</span>}
                        </span>

                        {/* Display salary ONLY if > 0 */}
                        {worker.salario && worker.salario > 0 ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            {formatCurrency(worker.salario)}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                        <span>Região / Localidade: <strong>{worker.regiao || 'Geral'}</strong></span>
                        {worker.nomeCliente && (
                          <span className="truncate max-w-[140px] text-slate-400">{worker.nomeCliente}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Link */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400">
                    Admissão: {formatDate(worker.dataAdmissao)}
                  </span>
                  <button
                    onClick={() => onSelectWorker(worker)}
                    className="font-bold text-[#401669] group-hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Ver Detalhes →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

