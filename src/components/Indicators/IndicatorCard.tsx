
import React from 'react';
import { Activity, Plus, Star } from 'lucide-react';

export interface IndicatorCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  favorite: boolean;
}

interface IndicatorCardProps {
  indicator: IndicatorCatalogItem;
  onToggleFavorite: (id: string) => void;
  onAdd: (id: string) => void;
  alreadyAdded?: boolean;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({
  indicator,
  onToggleFavorite,
  onAdd,
  alreadyAdded = false,
}) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        <Activity size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-slate-900 dark:text-white">
          {indicator.name}
        </div>

        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {indicator.description}
        </p>

        <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {indicator.category}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleFavorite(indicator.id)}
          aria-label={
            indicator.favorite
              ? `Hapus ${indicator.name} dari favorit`
              : `Tambahkan ${indicator.name} ke favorit`
          }
          title={indicator.favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
          className="rounded-md p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-slate-800"
        >
          <Star
            size={17}
            fill={indicator.favorite ? 'currentColor' : 'none'}
            className={indicator.favorite ? 'text-amber-500' : ''}
          />
        </button>

        <button
          type="button"
          onClick={() => onAdd(indicator.id)}
          disabled={alreadyAdded}
          title={alreadyAdded ? 'Indikator sudah ditambahkan' : 'Tambahkan indikator'}
          className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={17} />
        </button>
      </div>
    </div>
  );
};

export default IndicatorCard;
