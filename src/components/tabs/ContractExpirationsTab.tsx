import React, { useState, useMemo } from 'react';
import { Funcionario } from '../../types';
import { formatDate } from '../../utils/dataParser';
import { Calendar, AlertTriangle, Clock, CalendarPlus, Search, Filter, Download, CheckCircle2, Building2, User, FileText } from 'lucide-react';

interface ContractExpirationsTabProps {
  data: Funcionario[];
  onSelectWorker?: (worker: Funcionario) => void;
}

interface ContractAlertItem {
  worker: Funcionario;
  targetDate: Date;
  dateType: 'contrato' | 'prorrogacao';
  formattedDateStr: string;
  daysRemaining: number;
  urgency: 'critical' | 'warning' | 'notice' | 'expired';
}

function parseDateObj(dateStr: any): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str || str === '-') return null;

  // ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }

  // Slash DD/MM/YYYY
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    const day = parseInt(slashParts[0], 10);
    const month = parseInt(slashParts[1], 10) - 1;
    const yearStr = slashParts[2].split('T')[0].split(' ')[0];
    const year = parseInt(yearStr, 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

export const ContractExpirationsTab: React.FC<ContractExpirationsTabProps> = ({
  data,
  onSelectWorker,
}) => {
  const [horizonFilter, setHorizonFilter] = useState<'all' | '30' | '60' | '90' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedEvents, setAddedEvents] = useState<{ [id: number]: boolean }>({});

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Calculate contract expirations
  const alertItems = useMemo(() => {
    const items: ContractAlertItem[] = [];

    data.forEach((worker) => {
      // Only active employees or recent
      if (!worker.isAtivo) return;

      const dateProrrogacao = parseDateObj(worker.dataVctoProrrogacao);
      const dateContrato = parseDateObj(worker.dataVctoContrato);

      // Prefer prorrogacao date if present, else contrato date
      let targetDate: Date | null = null;
      let dateType: 'contrato' | 'prorrogacao' = 'contrato';
      let formattedDateStr = '';

      if (dateProrrogacao) {
        targetDate = dateProrrogacao;
        dateType = 'prorrogacao';
        formattedDateStr = formatDate(worker.dataVctoProrrogacao);
      } else if (dateContrato) {
        targetDate = dateContrato;
        dateType = 'contrato';
        formattedDateStr = formatDate(worker.dataVctoContrato);
      }

      if (!targetDate) return;

      const diffTime = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Consider contracts expiring up to 90 days out, or already expired in last 30 days
      if (daysRemaining >= -30 && daysRemaining <= 90) {
        let urgency: 'critical' | 'warning' | 'notice' | 'expired' = 'notice';
        if (daysRemaining < 0) urgency = 'expired';
        else if (daysRemaining <= 30) urgency = 'critical';
        else if (daysRemaining <= 60) urgency = 'warning';
        else urgency = 'notice';

        items.push({
          worker,
          targetDate,
          dateType,
          formattedDateStr,
          daysRemaining,
          urgency,
        });
      }
    });

    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [data, today]);

  // Counts
  const expiredCount = alertItems.filter((i) => i.daysRemaining <= 0).length;
  const criticalCount = alertItems.filter((i) => i.daysRemaining > 0 && i.daysRemaining <= 30).length;
  const warningCount = alertItems.filter((i) => i.daysRemaining > 30 && i.daysRemaining <= 60).length;
  const noticeCount = alertItems.filter((i) => i.daysRemaining > 60 && i.daysRemaining <= 90).length;

  // Filtered list
  const filteredItems = useMemo(() => {
    return alertItems.filter((item) => {
      if (horizonFilter === '30' && (item.daysRemaining < 0 || item.daysRemaining > 30)) return false;
      if (horizonFilter === '60' && (item.daysRemaining <= 30 || item.daysRemaining > 60)) return false;
      if (horizonFilter === '90' && (item.daysRemaining <= 60 || item.daysRemaining > 90)) return false;
      if (horizonFilter === 'expired' && item.daysRemaining > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          item.worker.nome.toLowerCase().includes(q) ||
          item.worker.cargo.toLowerCase().includes(q) ||
          item.worker.grupoEconomico.toLowerCase().includes(q) ||
          item.worker.nomeCliente.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [alertItems, horizonFilter, searchQuery]);

  // Generate Google Calendar Link
  const getGoogleCalendarUrl = (item: ContractAlertItem) => {
    const date = item.targetDate;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateIso = `${year}${month}${day}`;

    const title = encodeURIComponent(`METARH: Vencimento Contrato - ${item.worker.nome}`);
    const details = encodeURIComponent(
      `Lembrete de Vencimento de Contrato METARH\n\n` +
      `Colaborador: ${item.worker.nome}\n` +
      `Cargo: ${item.worker.cargo}\n` +
      `Grupo Econômico: ${item.worker.grupoEconomico}\n` +
      `Cliente: ${item.worker.nomeCliente}\n` +
      `Tipo de Vencimento: ${item.dateType === 'prorrogacao' ? 'Prorrogação' : 'Contrato Término'}\n` +
      `Data de Vencimento: ${item.formattedDateStr}\n`
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateIso}/${dateIso}&details=${details}`;
  };

  // Generate and Download ICS file for an individual item
  const downloadIcsEvent = (item: ContractAlertItem) => {
    const date = item.targetDate;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateIso = `${year}${month}${day}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//METARH HR Analytics//Contratos a Vencer//PT_BR',
      'BEGIN:VEVENT',
      `UID:metarh-contract-${item.worker.id}-${dateIso}@metarh.com`,
      `DTSTAMP:${dateIso}T080000Z`,
      `DTSTART;VALUE=DATE:${dateIso}`,
      `DTEND;VALUE=DATE:${dateIso}`,
      `SUMMARY:Vencimento Contrato METARH - ${item.worker.nome}`,
      `DESCRIPTION:Vencimento de Contrato\\nColaborador: ${item.worker.nome}\\nCargo: ${item.worker.cargo}\\nGrupo: ${item.worker.grupoEconomico}\\nCliente: ${item.worker.nomeCliente}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P3D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Lembrete: Vencimento de contrato em 3 dias',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vencimento_contrato_${item.worker.nome.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAddedEvents((prev) => ({ ...prev, [item.worker.id]: true }));
  };

  // Bulk Export all upcoming expirations to ICS
  const downloadAllIcsEvents = () => {
    if (filteredItems.length === 0) return;

    const vevents = filteredItems.map((item) => {
      const date = item.targetDate;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateIso = `${year}${month}${day}`;

      return [
        'BEGIN:VEVENT',
        `UID:metarh-contract-${item.worker.id}-${dateIso}@metarh.com`,
        `DTSTAMP:${dateIso}T080000Z`,
        `DTSTART;VALUE=DATE:${dateIso}`,
        `DTEND;VALUE=DATE:${dateIso}`,
        `SUMMARY:Vencimento Contrato METARH - ${item.worker.nome}`,
        `DESCRIPTION:Vencimento de Contrato\\nColaborador: ${item.worker.nome}\\nCargo: ${item.worker.cargo}\\nGrupo: ${item.worker.grupoEconomico}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n');
    });

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//METARH HR Analytics//Contratos a Vencer//PT_BR',
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `METARH_Lembretes_Vencimentos_${new Date().toISOString().slice(0, 10)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#470082] flex items-center gap-2.5 font-['Barlow']">
            <Calendar className="w-6 h-6 text-[#9f04d4]" />
            Relatório de Contratos a Vencer (30, 60 e 90 Dias)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Planejamento antecipado para renovações, prorrogações ou encerramentos de contrato de trabalho.
          </p>
        </div>

        <button
          onClick={downloadAllIcsEvents}
          disabled={filteredItems.length === 0}
          className="bg-[#470082] hover:bg-[#5c00a8] disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 flex-shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Exportar Todos para Agenda (.ics)</span>
        </button>
      </div>

      {/* KPI Horizon Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Até 30 Dias - Critical */}
        <div
          onClick={() => setHorizonFilter('30')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            horizonFilter === '30'
              ? 'bg-rose-500 text-white border-rose-600 shadow-md ring-2 ring-rose-400'
              : 'bg-rose-50 border-rose-200 hover:bg-rose-100/70 text-rose-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              horizonFilter === '30' ? 'bg-white text-rose-600' : 'bg-rose-200 text-rose-800'
            }`}>
              🚨 Crítico
            </span>
            <AlertTriangle className={`w-4 h-4 ${horizonFilter === '30' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <p className="text-2xl font-extrabold">{criticalCount.toLocaleString('pt-BR')}</p>
          <p className="text-xs font-medium opacity-90 mt-0.5">Vencendo nos próximos 30 dias</p>
        </div>

        {/* 31 a 60 Dias - Warning */}
        <div
          onClick={() => setHorizonFilter('60')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            horizonFilter === '60'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
              : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70 text-amber-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              horizonFilter === '60' ? 'bg-white text-amber-600' : 'bg-amber-200 text-amber-800'
            }`}>
              ⚠️ Atenção
            </span>
            <Clock className={`w-4 h-4 ${horizonFilter === '60' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <p className="text-2xl font-extrabold">{warningCount.toLocaleString('pt-BR')}</p>
          <p className="text-xs font-medium opacity-90 mt-0.5">Vencendo entre 31 e 60 dias</p>
        </div>

        {/* 61 a 90 Dias - Notice */}
        <div
          onClick={() => setHorizonFilter('90')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            horizonFilter === '90'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400'
              : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100/70 text-indigo-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              horizonFilter === '90' ? 'bg-white text-indigo-600' : 'bg-indigo-200 text-indigo-800'
            }`}>
              ℹ️ Planejamento
            </span>
            <Calendar className={`w-4 h-4 ${horizonFilter === '90' ? 'text-white' : 'text-indigo-600'}`} />
          </div>
          <p className="text-2xl font-extrabold">{noticeCount.toLocaleString('pt-BR')}</p>
          <p className="text-xs font-medium opacity-90 mt-0.5">Vencendo entre 61 e 90 dias</p>
        </div>

        {/* Vencidos / Hoje */}
        <div
          onClick={() => setHorizonFilter('expired')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            horizonFilter === 'expired'
              ? 'bg-slate-800 text-white border-slate-900 shadow-md ring-2 ring-slate-600'
              : 'bg-slate-100 border-slate-200 hover:bg-slate-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              horizonFilter === 'expired' ? 'bg-white text-slate-900' : 'bg-slate-300 text-slate-800'
            }`}>
              ⏰ Vencidos / Hoje
            </span>
            <FileText className={`w-4 h-4 ${horizonFilter === 'expired' ? 'text-white' : 'text-slate-600'}`} />
          </div>
          <p className="text-2xl font-extrabold">{expiredCount.toLocaleString('pt-BR')}</p>
          <p className="text-xs font-medium opacity-90 mt-0.5">Vencimento até hoje / expirado</p>
        </div>

      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Horizon Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setHorizonFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              horizonFilter === 'all' ? 'bg-[#470082] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos os Próximos 90d ({alertItems.length})
          </button>
          <button
            onClick={() => setHorizonFilter('30')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              horizonFilter === '30' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Até 30 Dias ({criticalCount})
          </button>
          <button
            onClick={() => setHorizonFilter('60')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              horizonFilter === '60' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            31 a 60 Dias ({warningCount})
          </button>
          <button
            onClick={() => setHorizonFilter('90')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              horizonFilter === '90' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            61 a 90 Dias ({noticeCount})
          </button>
        </div>

        {/* Local Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por colaborador, cargo, grupo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#470082] focus:bg-white text-slate-800"
          />
        </div>

      </div>

      {/* Expirations List Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">Nenhum contrato a vencer nesta categoria</h4>
            <p className="text-xs text-slate-400 mt-1">Todos os contratos ativos estão dentro dos prazos regulativos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Status / Urgência</th>
                  <th className="p-3.5">Colaborador</th>
                  <th className="p-3.5">Cargo / Função</th>
                  <th className="p-3.5">Grupo Econômico & Cliente</th>
                  <th className="p-3.5">Data Vencimento</th>
                  <th className="p-3.5">Prazo Restante</th>
                  <th className="p-3.5 pr-5 text-right">Ação / Agenda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => {
                  const isAdded = addedEvents[item.worker.id];

                  return (
                    <tr key={item.worker.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Urgency Badge */}
                      <td className="p-3.5 pl-5">
                        {item.daysRemaining <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-800 text-white">
                            ⏰ Vencido
                          </span>
                        ) : item.daysRemaining <= 30 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            🚨 Até 30d
                          </span>
                        ) : item.daysRemaining <= 60 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            ⚠️ 31 - 60d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            ℹ️ 61 - 90d
                          </span>
                        )}
                      </td>

                      {/* Colaborador Name */}
                      <td className="p-3.5 font-bold text-slate-900">
                        <button
                          onClick={() => onSelectWorker?.(item.worker)}
                          className="hover:text-[#470082] transition-colors text-left flex items-center gap-2 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.worker.nome}</span>
                        </button>
                      </td>

                      {/* Cargo */}
                      <td className="p-3.5 text-slate-700">
                        {item.worker.cargo}
                      </td>

                      {/* Grupo & Cliente */}
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800">{item.worker.grupoEconomico}</p>
                        <p className="text-[10px] text-slate-400">{item.worker.nomeCliente}</p>
                      </td>

                      {/* Data Vencimento */}
                      <td className="p-3.5 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#470082]" />
                          <span>{item.formattedDateStr}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {item.dateType === 'prorrogacao' ? 'Prorrogação' : 'Término de Contrato'}
                        </p>
                      </td>

                      {/* Days Remaining */}
                      <td className="p-3.5 font-bold">
                        {item.daysRemaining < 0 ? (
                          <span className="text-rose-600">Vencido há {Math.abs(item.daysRemaining)} dias</span>
                        ) : item.daysRemaining === 0 ? (
                          <span className="text-rose-600 uppercase font-black">Vence Hoje!</span>
                        ) : (
                          <span className={item.daysRemaining <= 30 ? 'text-rose-600' : item.daysRemaining <= 60 ? 'text-amber-600' : 'text-indigo-600'}>
                            Faltam {item.daysRemaining} dias
                          </span>
                        )}
                      </td>

                      {/* Calendar Action Buttons */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Add to Google Calendar */}
                          <a
                            href={getGoogleCalendarUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-purple-50 hover:bg-purple-100 text-[#470082] rounded-lg transition-all border border-purple-200 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="Adicionar ao Google Calendar"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Google Calendar</span>
                          </a>

                          {/* Download ICS File */}
                          <button
                            onClick={() => downloadIcsEvent(item)}
                            className={`p-1.5 rounded-lg transition-all border flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-500 text-white border-emerald-600'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            title="Baixar arquivo de agenda (.ics) para Outlook/Apple"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isAdded ? 'Agendado!' : '.ics'}</span>
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
