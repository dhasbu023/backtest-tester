
import React from 'react';

export type IndicatorTab = 'ALL' | 'FAVORITES';

interface IndicatorTabsProps {
  activeTab: IndicatorTab;
  onChange: (tab: IndicatorTab) => void;
  allCount?: number;
  favoritesCount?: number;
}

export const IndicatorTabs: React.FC<IndicatorTabsProps> = ({
  activeTab,
  onChange,
  allCount,
  favoritesCount,
}) => {
  const tabs: {
    id: IndicatorTab;
    label: string;
    count?: number;
  }[] = [
    {
      id: 'ALL',
      label: 'Semua Indikator',
      count: allCount,
    },
    {
      id: 'FAVORITES',
      label: 'Favorit',
      count: favoritesCount,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Kategori indikator"
      className="flex gap-2 border-b border-slate-200 dark:border-slate-800"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>{tab.label}</span>

            {tab.count !== undefined && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {tab.count}
              </span>
            )}

            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default IndicatorTabs;
