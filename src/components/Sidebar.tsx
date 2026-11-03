
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
  { label: 'Datasets', path: '/datasets', icon: Database },
];

type SidebarProps = {
  onNavigate?: () => void;
};

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItemClass = (isActive: boolean) => `
    group relative h-9 flex items-center rounded-md
    text-[13px] font-medium whitespace-nowrap
    transition-colors duration-150
    ${isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'}
    ${
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80'
    }
  `;

  return (
    <aside
      className={`
        h-full min-h-0 shrink-0 flex flex-col overflow-hidden
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        transition-[width] duration-200 ease-in-out
        ${isCollapsed ? 'w-[52px]' : 'w-[208px]'}
      `}
    >
      {/* HEADER */}
      <div
        className={`
          h-12 min-h-12 shrink-0 flex items-center
          border-b border-slate-200 dark:border-slate-800
          ${isCollapsed ? 'justify-center' : 'justify-between px-2.5'}
        `}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 shrink-0 rounded-md bg-blue-600 flex items-center justify-center">
              <ChartCandlestick className="w-4 h-4 text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="text-[11px] font-bold tracking-wide text-slate-900 dark:text-white whitespace-nowrap">
                FOREX TESTER
              </h1>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
            w-7 h-7 shrink-0 rounded-md
            flex items-center justify-center
            text-slate-500 dark:text-slate-400
            hover:text-blue-600 dark:hover:text-blue-400
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-colors duration-150
          "
        >
          <Menu className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* MENU */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1.5 py-2 space-y-0.5">
        {!isCollapsed && (
          <p className="px-2.5 pt-2 pb-1.5 text-[9px] font-semibold tracking-wider text-slate-400">
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
              className={({ isActive }) => navItemClass(isActive)}
            >
              <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} />

              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* BOTTOM */}
      <div className="shrink-0 px-1.5 py-2 border-t border-slate-200 dark:border-slate-800">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          title={isCollapsed ? 'Settings' : undefined}
          className={({ isActive }) => navItemClass(isActive)}
        >
          <Settings className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} />

          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
