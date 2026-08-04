import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Digitar ou selecionar...',
  allLabel = 'Todos',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Trigger button / Input */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 flex items-center justify-between cursor-pointer hover:border-purple-300 focus-within:ring-2 focus-within:ring-[#401669] transition-all bg-white"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className={`truncate font-medium ${value ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
            {value || allLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-fadeIn text-xs">
          {/* Internal Search Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#401669]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {/* All / Reset Option */}
            <div
              onClick={() => handleSelect('')}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-purple-50 hover:text-[#401669] transition-colors ${
                !value ? 'bg-purple-50/80 font-bold text-[#401669]' : 'text-slate-600'
              }`}
            >
              <span>{allLabel} ({options.length})</span>
              {!value && <Check className="w-3.5 h-3.5 text-[#401669]" />}
            </div>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-slate-400 italic text-[11px]">
                Nenhum resultado para "{search}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <div
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-purple-50 hover:text-[#401669] transition-colors ${
                      isSelected ? 'bg-purple-50/80 font-bold text-[#401669]' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#401669] flex-shrink-0" />}
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
