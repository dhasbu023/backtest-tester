import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

import Sidebar from '../components/Sidebar.js';

type MainLayoutProps = {
  children: ReactNode;
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sessions': 'Sessions',
  '/statistics': 'Statistics',
  '/datasets': 'Datasets',
  '/settings': 'Settings',
};

export default function MainLayout({
  children,
  isDarkMode,
  onToggleTheme,
}: MainLayoutProps) {
  const location = useLocation();

  const pageTitle =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith('/chart/')
      ? 'Chart Workspace'
      : location.pathname.startsWith('/backtest/')
        ? 'Backtest Workspace'
        : 'Forex Tester');

  return (
    <div className="w-full h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN AREA */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">

        {/* TOP HEADER */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">

          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">
              {pageTitle}
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Forex Tester Workspace
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 min-h-0 min-w-0 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}