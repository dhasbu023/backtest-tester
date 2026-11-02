import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import {
  LayoutDashboard,
  FolderOpen,
  ChartNoAxesCombined,
  ChartCandlestick,
  Database,
  Settings,
  Menu,
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Sessions', path: '/sessions', icon: FolderOpen },
  { label: 'Statistics', path: '/statistics', icon: ChartNoAxesCombined },
  { label: 'Backtest', path: '/sessions', icon: ChartCandlestick },
  { label: 'Datasets', path: '/datasets', icon: Database },
];

type SidebarProps = {
  onNavigate?: () => void;
};

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`
        h-full min-h-0 shrink-0 flex flex-col overflow-hidden
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        transition-[width] duration-300 ease-in-out
        ${isCollapsed ? 'w-[72px]' : 'w-64'}
      `}
    >
      {/* HEADER */}
      <div
        className={`
          h-16 min-h-16 shrink-0 flex items-center
          border-b border-slate-200 dark:border-slate-800
          ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}
        `}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center">
              <ChartCandlestick className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="font-bold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                FOREX TESTER
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Backtesting Platform
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          className="
            w-9 h-9 shrink-0 rounded-lg
            flex items-center justify-center
            text-slate-500 dark:text-slate-400
            hover:text-blue-600 dark:hover:text-blue-400
            hover:bg-slate-100 dark:hover:bg-slate-800
            active:scale-95
            transition-all duration-200
          "
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
        </button>

        {isCollapsed && (
          <div className="sr-only">Forex Tester</div>
        )}
      </div>

      {/* COLLAPSE LOGO */}
      {isCollapsed && (
        <div className="flex justify-center py-4 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <ChartCandlestick className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* MENU */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {!isCollapsed && (
          <p className="px-3 pt-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 whitespace-nowrap">
            WORKSPACE
          </p>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={onNavigate}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `
                  h-10 flex items-center rounded-lg
                  text-sm font-medium whitespace-nowrap
                  transition-colors duration-200
                  ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'}
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }
                `
              }
            >
              <Icon className="w-5 h-5 shrink-0" />

              {!isCollapsed && (
                <span>{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* BOTTOM */}
      <div className="shrink-0 p-3 border-t border-slate-200 dark:border-slate-800">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          title={isCollapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            `
              h-10 flex items-center rounded-lg
              text-sm font-medium whitespace-nowrap
              transition-colors duration-200
              ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'}
              ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }
            `
          }
        >
          <Settings className="w-5 h-5 shrink-0" />

          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}