
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
    <div className="flex h-dvh w-full min-h-0 min-w-0 overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN AREA */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

        {/* TOP HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">
              {pageTitle}
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Forex Tester Workspace
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

      </div>
    </div>
  );
}
