
import React from 'react';
import { Search, X } from 'lucide-react';

interface IndicatorSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const IndicatorSearch: React.FC<IndicatorSearchProps> = ({
  value,
  onChange,
  placeholder = 'Cari indikator...',
}) => {
  return (
    <div className="relative w-full">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Cari indikator"
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          title="Hapus pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default IndicatorSearch;
