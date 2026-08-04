import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, CheckSquare, Square } from 'lucide-react';

interface MultiSearchableSelectProps {
  label?: string;
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export const MultiSearchableSelect: React.FC<MultiSearchableSelectProps> = ({
  label,
  selectedValues,
  onChange,
  options,
  placeholder = 'Digitar ou buscar...',
  allLabel = 'Todos',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const handleSelectAll = () => {
    if (search.trim()) {
      const combined = Array.from(new Set([...selectedValues, ...filteredOptions]));
      onChange(combined);
    } else {
      onChange([...options]);
    }
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  const renderTriggerText = () => {
    if (selectedValues.length === 0) {
      return <span className="text-slate-400 font-medium">{allLabel}</span>;
    }
    if (selectedValues.length === 1) {
      return <span className="text-slate-800 font-semibold truncate">{selectedValues[0]}</span>;
    }
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="bg-[#401669] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0">
          {selectedValues.length}
        </span>
        <span className="text-slate-800 font-semibold truncate">
          {selectedValues.slice(0, 2).join(', ')}{selectedValues.length > 2 ? '...' : ''}
        </span>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 flex items-center justify-between cursor-pointer hover:border-purple-300 focus-within:ring-2 focus-within:ring-[#401669] transition-all bg-white shadow-2xs"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <div className="truncate min-w-0 flex-1">{renderTriggerText()}</div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedValues.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpar seleções"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fadeIn text-xs">
          {/* Header search & bulk action buttons */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/90 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#401669] text-slate-800"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#401669] hover:text-purple-900 font-bold cursor-pointer hover:underline"
              >
                Selecionar Todos ({filteredOptions.length})
              </button>
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearAll()}
                  className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer hover:underline"
                >
                  Limpar ({selectedValues.length})
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-400 italic">
                Nenhum item encontrado
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-50 text-[#401669] font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate pr-2">{opt}</span>
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#401669]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
