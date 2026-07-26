import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { getMyTeams, type Team } from '../../api/teams';

export function Topbar() {
  const location = useLocation();
  const hideSwitcher = location.pathname === '/team' || location.pathname === '/teams';
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeTeamId = useUIStore((s) => s.activeTeamId);
  const setActiveTeamId = useUIStore((s) => s.setActiveTeamId);
  const teamRefreshKey = useUIStore((s) => s.teamRefreshKey);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    getMyTeams().then((t) => {
      setTeams(t);
      // Clear active team if it no longer exists
      if (activeTeamId && !t.find((x) => x.id === activeTeamId)) {
        setActiveTeamId(null);
      }
    }).catch(() => {});
  }, [teamRefreshKey]);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  return (
    <header className="sticky top-0 z-10 h-16 bg-white/80 backdrop-blur-md border-b border-surface-200 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="flex items-center gap-2 ml-2">
        {teams.length > 0 && !hideSwitcher && (
          <select
            value={activeTeamId || ''}
            onChange={(e) => setActiveTeamId(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-surface-300 rounded-lg px-2 py-1.5 bg-white text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部团队</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <span className="text-sm text-surface-500">{user?.username}</span>
        <button
          onClick={logout}
          className="text-sm text-surface-400 hover:text-surface-600 transition-colors"
        >
          退出
        </button>
      </div>
    </header>
  );
}
