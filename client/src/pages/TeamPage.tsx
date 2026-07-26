import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getReports } from '../api/reports';
import { getMyTeams, getMembersWithoutReport, type Team } from '../api/teams';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/reports/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { Report } from '../types';
import { formatWeekLabel, formatDate } from '../utils/date';

function stripHtml(html: string) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').slice(0, 100);
}

export default function TeamPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [missingMembers, setMissingMembers] = useState<{ id: number; username: string }[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    getMyTeams().then((teams) => {
      setMyTeams(teams);
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    }).catch(() => {});
  }, []);

  const selectedTeam = myTeams.find((t) => t.id === selectedTeamId);
  const isOwner = selectedTeam?.my_role === 'owner';

  const loadReports = useCallback(async () => {
    if (!selectedTeamId) return;
    setLoading(true);
    try {
      const [data, mm] = await Promise.all([
        getReports({ team_id: selectedTeamId, limit: 50 }),
        isOwner ? getMembersWithoutReport(selectedTeamId) : Promise.resolve([]),
      ]);
      setReports(data.rows);
      setMissingMembers(Array.isArray(mm) ? mm : []);
    } catch {
      addToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, isOwner]);

  useEffect(() => { loadReports(); }, [loadReports]);

  if (myTeams.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          title="暂无团队"
          description="你还没有加入任何团队"
          action={<Link to="/teams"><Button size="sm">去加入团队</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-800">团队视图</h1>
        <select
          value={selectedTeamId || ''}
          onChange={(e) => setSelectedTeamId(Number(e.target.value))}
          className="text-sm border border-surface-300 rounded-lg px-3 py-2 bg-white text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {myTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}{t.my_role === 'owner' ? ' (管理)' : ''}
            </option>
          ))}
        </select>
      </div>

      {isOwner && missingMembers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <h2 className="font-semibold text-surface-800 mb-3">本周未提交周报 ({missingMembers.length})</h2>
          <div className="flex flex-wrap gap-2">
            {missingMembers.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-amber-800 rounded-full text-sm border border-amber-200">
                {m.username}
              </span>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-surface-400">加载中...</p>
      ) : reports.length === 0 ? (
        <EmptyState title="暂无周报" description={selectedTeam ? `"${selectedTeam.name}" 暂无周报` : '请选择一个团队'} />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link key={r.id} to={`/reports/${r.id}`}>
              <Card className="hover:border-primary-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-surface-800">{r.username}</span>
                      <StatusBadge status={r.status} reviewed={r.reviewed} />
                    </div>
                    <p className="text-sm text-surface-500 mt-1">
                      {formatWeekLabel(r.week_start, r.week_end)} &middot; {formatDate(r.created_at)}
                    </p>
                  </div>
                  <p className="text-sm text-surface-600 max-w-xs truncate">
                    {stripHtml(r.work_done)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
