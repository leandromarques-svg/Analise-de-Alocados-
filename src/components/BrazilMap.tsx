import React, { useState } from 'react';
import { getUFName } from '../utils/dataParser';

export interface StateData {
  uf: string;
  total: number;
  ativos: number;
  desligados: number;
}

interface BrazilMapProps {
  ufData: { [uf: string]: StateData };
  totalWorkers: number;
  selectedUF?: string | null;
  onSelectUF?: (uf: string | null) => void;
}

// Standard SVG paths for all 27 Brazilian States (viewBox 0 0 600 600)
// Scaled & optimized to represent official state shapes accurately on 600x600 viewport
const BRAZIL_STATES_SVG: { [key: string]: { path: string; labelX: number; labelY: number; name: string } } = {
  AC: {
    name: 'Acre',
    path: 'M 35 240 L 75 220 L 105 235 L 90 265 L 60 270 L 25 260 Z',
    labelX: 60,
    labelY: 250,
  },
  AM: {
    name: 'Amazonas',
    path: 'M 75 130 L 175 110 L 210 150 L 195 210 L 140 220 L 105 235 L 75 220 L 60 170 Z',
    labelX: 130,
    labelY: 170,
  },
  RR: {
    name: 'Roraima',
    path: 'M 130 50 L 170 50 L 180 110 L 125 115 L 115 80 Z',
    labelX: 145,
    labelY: 80,
  },
  PA: {
    name: 'Pará',
    path: 'M 175 110 L 285 95 L 305 130 L 290 215 L 245 220 L 210 150 Z',
    labelX: 240,
    labelY: 155,
  },
  AP: {
    name: 'Amapá',
    path: 'M 255 55 L 295 60 L 285 95 L 245 85 Z',
    labelX: 270,
    labelY: 75,
  },
  RO: {
    name: 'Rondônia',
    path: 'M 105 235 L 140 220 L 160 265 L 130 295 L 90 265 Z',
    labelX: 125,
    labelY: 255,
  },
  TO: {
    name: 'Tocantins',
    path: 'M 290 215 L 325 200 L 335 275 L 300 290 L 280 245 Z',
    labelX: 308,
    labelY: 245,
  },
  MA: {
    name: 'Maranhão',
    path: 'M 285 95 L 360 135 L 340 195 L 325 200 L 290 215 Z',
    labelX: 320,
    labelY: 160,
  },
  PI: {
    name: 'Piauí',
    path: 'M 360 135 L 380 145 L 370 215 L 335 225 L 340 195 Z',
    labelX: 355,
    labelY: 180,
  },
  CE: {
    name: 'Ceará',
    path: 'M 380 145 L 420 135 L 425 170 L 390 175 L 375 160 Z',
    labelX: 400,
    labelY: 155,
  },
  RN: {
    name: 'Rio Grande do Norte',
    path: 'M 420 135 L 450 140 L 445 160 L 425 160 Z',
    labelX: 435,
    labelY: 148,
  },
  PB: {
    name: 'Paraíba',
    path: 'M 425 160 L 460 160 L 455 175 L 420 175 Z',
    labelX: 440,
    labelY: 167,
  },
  PE: {
    name: 'Pernambuco',
    path: 'M 390 175 L 460 175 L 455 190 L 380 190 Z',
    labelX: 420,
    labelY: 182,
  },
  AL: {
    name: 'Alagoas',
    path: 'M 425 190 L 455 190 L 445 205 L 420 200 Z',
    labelX: 438,
    labelY: 197,
  },
  SE: {
    name: 'Sergipe',
    path: 'M 410 200 L 435 205 L 425 220 L 405 215 Z',
    labelX: 418,
    labelY: 210,
  },
  BA: {
    name: 'Bahia',
    path: 'M 335 225 L 370 215 L 425 220 L 415 295 L 350 315 L 335 275 Z',
    labelX: 375,
    labelY: 265,
  },
  MT: {
    name: 'Mato Grosso',
    path: 'M 195 210 L 290 215 L 280 245 L 300 290 L 260 345 L 180 320 L 160 265 Z',
    labelX: 235,
    labelY: 270,
  },
  GO: {
    name: 'Goiás',
    path: 'M 300 290 L 335 275 L 350 315 L 335 365 L 285 360 L 280 325 Z',
    labelX: 312,
    labelY: 325,
  },
  DF: {
    name: 'Distrito Federal',
    path: 'M 322 312 L 335 312 L 335 325 L 322 325 Z',
    labelX: 328,
    labelY: 318,
  },
  MS: {
    name: 'Mato Grosso do Sul',
    path: 'M 180 320 L 260 345 L 280 395 L 230 420 L 195 380 Z',
    labelX: 230,
    labelY: 370,
  },
  MG: {
    name: 'Minas Gerais',
    path: 'M 350 315 L 415 295 L 410 355 L 375 390 L 315 370 L 335 365 Z',
    labelX: 365,
    labelY: 350,
  },
  ES: {
    name: 'Espírito Santo',
    path: 'M 410 355 L 430 355 L 420 385 L 400 380 Z',
    labelX: 415,
    labelY: 368,
  },
  RJ: {
    name: 'Rio de Janeiro',
    path: 'M 375 390 L 415 380 L 400 410 L 365 405 Z',
    labelX: 388,
    labelY: 397,
  },
  SP: {
    name: 'São Paulo',
    path: 'M 285 360 L 335 365 L 375 390 L 365 405 L 310 425 L 275 395 Z',
    labelX: 325,
    labelY: 390,
  },
  PR: {
    name: 'Paraná',
    path: 'M 275 395 L 325 410 L 310 450 L 265 440 Z',
    labelX: 292,
    labelY: 425,
  },
  SC: {
    name: 'Santa Catarina',
    path: 'M 265 440 L 310 450 L 295 480 L 260 470 Z',
    labelX: 282,
    labelY: 460,
  },
  RS: {
    name: 'Rio Grande do Sul',
    path: 'M 260 470 L 295 480 L 285 540 L 230 520 L 240 480 Z',
    labelX: 262,
    labelY: 502,
  },
};

export const BrazilMap: React.FC<BrazilMapProps> = ({
  ufData,
  totalWorkers,
  selectedUF,
  onSelectUF,
}) => {
  const [hoveredUF, setHoveredUF] = useState<string | null>(null);

  // Find max total count for relative color intensity
  const maxTotal = Math.max(
    ...Object.values(ufData).map((d: StateData) => d.total),
    1
  );

  const getFillColor = (uf: string) => {
    const data = ufData[uf];
    const isSelected = selectedUF === uf;
    const isHovered = hoveredUF === uf;

    if (!data || data.total === 0) {
      if (isSelected) return '#c084fc';
      if (isHovered) return '#e9d5ff';
      return '#f3e8ff';
    }

    // Heatmap opacity calculation
    const ratio = data.total / maxTotal;

    if (isSelected) return '#facc15'; // Vibrant Gold/Yellow when active filter
    if (isHovered) return '#c026d3';  // Bright Magenta when hovered

    if (ratio > 0.5) return '#470082';      // Very High (SP, etc.)
    if (ratio > 0.1) return '#7e22ce';      // High
    if (ratio > 0.03) return '#a855f7';     // Medium
    if (ratio > 0.005) return '#c084fc';    // Low
    return '#e9d5ff';                       // Very Low
  };

  const activeHoverData = hoveredUF ? ufData[hoveredUF] : null;

  return (
    <div className="relative w-full flex flex-col items-center">
      
      {/* Top Map Controls & Active Filter Status */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-[#470082]">
            Mapa Vetorial de Alocações
          </span>
        </div>

        {selectedUF && (
          <button
            onClick={() => onSelectUF && onSelectUF(null)}
            className="text-[11px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-all border border-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Filtro Ativo: UF {selectedUF}</span>
            <span className="text-amber-900 font-bold ml-1">✕ Limpar</span>
          </button>
        )}
      </div>

      {/* SVG Map Canvas Container */}
      <div className="relative w-full max-w-[520px] aspect-square bg-gradient-to-b from-purple-50/40 to-purple-100/30 rounded-2xl border border-purple-200/80 p-3 shadow-inner flex items-center justify-center overflow-hidden">
        
        <svg
          viewBox="0 0 520 580"
          className="w-full h-full filter drop-shadow-md select-none transition-all duration-300"
        >
          {/* Brazil Map SVG Paths */}
          <g className="transition-all duration-200">
            {Object.entries(BRAZIL_STATES_SVG).map(([uf, stateInfo]) => {
              const stateData = ufData[uf];
              const total = stateData ? stateData.total : 0;
              const isSelected = selectedUF === uf;
              const isHovered = hoveredUF === uf;

              return (
                <g key={uf} className="cursor-pointer group">
                  <path
                    d={stateInfo.path}
                    fill={getFillColor(uf)}
                    stroke={isSelected ? '#000000' : isHovered ? '#ffffff' : '#5b21b6'}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="transition-all duration-200 hover:opacity-95"
                    onMouseEnter={() => setHoveredUF(uf)}
                    onMouseLeave={() => setHoveredUF(null)}
                    onClick={() => onSelectUF && onSelectUF(selectedUF === uf ? null : uf)}
                  />
                  
                  {/* UF Label badge inside state */}
                  <text
                    x={stateInfo.labelX}
                    y={stateInfo.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#000000' : (total > 0 && total / maxTotal > 0.03) ? '#ffffff' : '#3b0764'}
                    fontSize={total > 1000 ? '11' : '10'}
                    fontWeight="900"
                    className="pointer-events-none select-none tracking-tight font-sans"
                    style={{ textShadow: isSelected ? 'none' : '0px 1px 2px rgba(0,0,0,0.4)' }}
                  >
                    {uf}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredUF && (
          <div className="absolute top-4 right-4 bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-purple-400/50 backdrop-blur-md z-20 pointer-events-none min-w-[170px] animate-fadeIn">
            <div className="flex items-center justify-between gap-2 border-b border-purple-700/60 pb-1.5 mb-1.5">
              <span className="text-xs font-black text-amber-300">
                {BRAZIL_STATES_SVG[hoveredUF]?.name || getUFName(hoveredUF)} ({hoveredUF})
              </span>
              <span className="text-[10px] font-bold bg-purple-600 px-1.5 py-0.5 rounded-full text-white">
                UF
              </span>
            </div>

            {activeHoverData && activeHoverData.total > 0 ? (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between items-center text-slate-200 font-bold">
                  <span>Total Alocados:</span>
                  <span className="text-amber-300 font-extrabold">{activeHoverData.total.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-300">
                  <span>Ativos:</span>
                  <span className="font-bold">{activeHoverData.ativos.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-pink-300">
                  <span>Desligados:</span>
                  <span className="font-bold">{activeHoverData.desligados.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-purple-200 border-t border-purple-800/80 pt-1 mt-1 font-bold">
                  <span>Proporção:</span>
                  <span>{((activeHoverData.total / (totalWorkers || 1)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-300 italic">Nenhum profissional alocado nesta UF.</p>
            )}
            <p className="text-[9px] text-purple-300 font-semibold mt-2 text-center border-t border-purple-800/50 pt-1">
              Clique para filtrar
            </p>
          </div>
        )}

      </div>

      {/* Heatmap Scale Legend */}
      <div className="w-full mt-3 p-2.5 bg-white/80 rounded-xl border border-purple-100 flex flex-wrap items-center justify-between text-[11px] font-bold text-[#470082] gap-2">
        <span className="text-[10px] text-purple-800 uppercase tracking-wider font-extrabold">Volume:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#e9d5ff] border border-purple-300 inline-block"></span>
          <span className="text-[10px] font-semibold text-slate-600">Baixo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#c084fc] inline-block"></span>
          <span className="text-[10px] font-semibold text-slate-600">Médio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#7e22ce] inline-block"></span>
          <span className="text-[10px] font-semibold text-slate-600">Alto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#470082] inline-block"></span>
          <span className="text-[10px] font-extrabold text-[#470082]">Muito Alto (SP)</span>
        </div>
      </div>

    </div>
  );
};
