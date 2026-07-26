import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { getMyTeams } from '../../api/teams';
import { cn } from '../../utils/cn';

const navItems = [
  {
    to: '/dashboard',
    label: '仪表盘',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : 'currentColor'} strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: '周报列表',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : 'currentColor'} strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    to: '/reports/new',
    label: '写周报',
    requireTeam: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : 'currentColor'} strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    to: '/team',
    label: '团队视图',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : 'currentColor'} strokeWidth="2">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    roles: ['admin', 'manager'],
  },
  {
    to: '/admin/teams',
    label: '管理团队',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : 'currentColor'} strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    roles: ['admin'],
  },
  {
    to: '/teams',
    label: '我的团队',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : 'currentColor'} strokeWidth="2">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const teamRefreshKey = useUIStore((s) => s.teamRefreshKey);
  const [hasTeams, setHasTeams] = useState(false);

  useEffect(() => {
    getMyTeams().then((teams) => setHasTeams(teams.length > 0)).catch(() => {});
  }, [teamRefreshKey]);

  const filteredItems = navItems.filter((item: any) => {
    if (item.roles && user && !item.roles.includes(user.role)) return false;
    if (item.requireTeam && !hasTeams) return false;
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 z-30 h-full w-60 bg-white border-r border-surface-200 flex flex-col transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-surface-100">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 7h.01M12 7h.01M16 7h.01M8 12h.01M12 12h.01M16 12h.01M8 17h8" />
            </svg>
          </div>
          <span className="font-semibold text-surface-800 text-base">周报系统</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredItems.map((item) => {
            const active = location.pathname === item.to || (location.pathname.startsWith(item.to + '/') && item.to !== '/reports');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => { if (window.innerWidth < 1024) toggleSidebar(); }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-800'
                )}
              >
                {item.icon(active)}
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-surface-100">
          <NavLink
            to="/profile"
            onClick={() => { if (window.innerWidth < 1024) toggleSidebar(); }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100',
              location.pathname === '/profile'
                ? 'bg-primary-50 text-primary-700'
                : 'text-surface-600 hover:bg-surface-50 hover:text-surface-800'
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            个人设置
          </NavLink>
        </div>
      </aside>
    </>
  );
}
