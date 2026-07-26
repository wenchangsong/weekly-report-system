import { useEffect, useState } from 'react';
import { getAllTeams, deleteTeamAsAdmin } from '../api/teams';
import client from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useUIStore } from '../stores/uiStore';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useUIStore((s) => s.addToast);
  const triggerTeamRefresh = useUIStore((s) => s.triggerTeamRefresh);

  const load = async () => {
    setLoading(true);
    try {
      setTeams(await getAllTeams());
    } catch {
      addToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReset = async () => {
    if (!confirm('⚠️ 确定要重置所有数据吗？\n\n这将删除：\n- 所有团队\n- 所有周报和评论\n- 除管理员外的所有用户\n\n此操作不可撤销！')) return;
    if (!confirm('再次确认：真的要重置所有数据吗？')) return;
    try {
      await client.post('/teams/reset');
      triggerTeamRefresh();
      addToast('所有数据已重置', 'success');
      load();
    } catch {
      addToast('重置失败', 'error');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除团队「${name}」吗？所有成员将被移除。`)) return;
    try {
      await deleteTeamAsAdmin(id);
      triggerTeamRefresh();
      addToast(`已删除「${name}」`, 'success');
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      addToast(err.response?.data?.error || '删除失败', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-800">管理所有团队</h1>
        <Button variant="danger" size="sm" onClick={handleReset}>重置所有</Button>
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-surface-400">暂无团队</p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const pct = team.total_members > 0
              ? Math.round((team.submitted_count / team.total_members) * 100)
              : 0;
            return (
              <Card key={team.id}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-surface-800">{team.name}</h3>
                      <span className="text-xs text-surface-400">负责人: {team.owner_name}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex-1 max-w-xs">
                        <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                          <span>本周提交率</span>
                          <span className="font-medium">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct === 100 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-surface-400">
                        {team.submitted_count}/{team.total_members} 人已提交
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(team.id, team.name)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
