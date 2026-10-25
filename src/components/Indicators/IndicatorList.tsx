
import React from 'react';
import { Search } from 'lucide-react';

import IndicatorCard, {
  type IndicatorCatalogItem,
} from './IndicatorCard';

import type { IndicatorTab } from './IndicatorTabs';

interface IndicatorListProps {
  indicators: IndicatorCatalogItem[];
  searchQuery: string;
  activeTab: IndicatorTab;
  onToggleFavorite: (id: string) => void;
  onAdd: (id: string) => void;
  addedIndicatorIds?: string[];
}

const IndicatorList: React.FC<IndicatorListProps> = ({
  indicators,
  searchQuery,
  activeTab,
  onToggleFavorite,
  onAdd,
  addedIndicatorIds = [],
}) => {
  const query = searchQuery.trim().toLowerCase();

  const filteredIndicators = indicators.filter((indicator) => {
    const matchesSearch =
      indicator.name.toLowerCase().includes(query) ||
      indicator.description.toLowerCase().includes(query) ||
      indicator.category.toLowerCase().includes(query);

    const matchesTab =
      activeTab === 'ALL' || indicator.favorite;

    return matchesSearch && matchesTab;
  });

  if (filteredIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Search size={28} className="mb-3 text-slate-400" />

        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Tidak ada indikator ditemukan
        </p>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Coba kata kunci lain atau periksa daftar favorit kamu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredIndicators.map((indicator) => (
        <IndicatorCard
          key={indicator.id}
          indicator={indicator}
          onToggleFavorite={onToggleFavorite}
          onAdd={onAdd}
          alreadyAdded={addedIndicatorIds.includes(indicator.id)}
        />
      ))}
    </div>
  );
};

export default IndicatorList;
