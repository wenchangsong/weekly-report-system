import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyTeams, getAvailableTeams, requestJoinTeam, createTeamRequest, getPendingTeamRequests, approveTeamRequest, rejectTeamRequest, getJoinRequests, approveJoinRequest, rejectJoinRequest, type Team, type TeamRequest } from '../api/teams';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function TeamListPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableTeams, setAvailableTeams] = useState<(Team & { owner_name: string })[]>([]);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [ownedJoinReqs, setOwnedJoinReqs] = useState<Record<number, TeamRequest[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, r, a] = await Promise.all([
        getMyTeams(),
        user?.role === 'admin' ? getPendingTeamRequests() : Promise.resolve([]),
        getAvailableTeams(),
      ]);
      setTeams(t);
      setRequests(r);
      setAvailableTeams(a);

      // Load join requests for teams user owns
      const jrMap: Record<number, TeamRequest[]> = {};
      await Promise.all(
        t.filter((team) => team.my_role === 'owner').map(async (team) => {
          try {
            jrMap[team.id] = await getJoinRequests(team.id);
          } catch {
            jrMap[team.id] = [];
          }
        })
      );
      setOwnedJoinReqs(jrMap);
    } catch {
      addToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateRequest = async () => {
    if (!teamName.trim()) return;
    setSubmitting(true);
    try {
      await createTeamRequest(teamName.trim());
      addToast('申请已提交，等待管理员审核', 'success');
      setModalOpen(false);
      setTeamName('');
    } catch {
      addToast('申请失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveTeamRequest(id);
      addToast('已批准', 'success');
      loadData();
    } catch { addToast('操作失败', 'error'); }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectTeamRequest(id);
      addToast('已拒绝', 'success');
      loadData();
    } catch { addToast('操作失败', 'error'); }
  };

  const handleApproveJoinFromList = async (reqId: number, teamId: number, name: string) => {
    if (!confirm(`确认批准「${name}」加入团队？`)) return;
    try {
      await approveJoinRequest(reqId);
      addToast(`已批准 ${name} 加入`, 'success');
      // Reload join requests for this team
      const jr = await getJoinRequests(teamId);
      setOwnedJoinReqs((prev) => ({ ...prev, [teamId]: jr }));
      loadData();
    } catch (err: any) {
      addToast(err.response?.data?.error || '审批失败', 'error');
    }
  };

  const handleRejectJoinFromList = async (reqId: number, teamId: number) => {
    try {
      await rejectJoinRequest(reqId);
      addToast('已拒绝', 'success');
      const jr = await getJoinRequests(teamId);
      setOwnedJoinReqs((prev) => ({ ...prev, [teamId]: jr }));
    } catch (err: any) {
      addToast(err.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleJoin = async (teamId: number) => {
    try {
      await requestJoinTeam(teamId);
      addToast('申请已提交，等待核审', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.response?.data?.error || '加入失败', 'error');
    }
  };

  if (loading) return <p className="text-sm text-surface-400">加载中...</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-800">我的团队</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>申请创建团队</Button>
      </div>

      {teams.length === 0 && requests.length === 0 ? (
        <EmptyState title="暂无团队" description="申请创建一个团队，或等待被邀请加入" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id} onClick={() => navigate(`/teams/${team.id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-surface-800">{team.name}</h3>
                  <p className="text-sm text-surface-500 mt-1">
                    {team.my_role === 'owner' ? '团队负责人' : '成员'}
                  </p>
                </div>
                <Badge className={team.my_role === 'owner' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}>
                  {team.my_role === 'owner' ? 'Owner' : 'Member'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Available teams to join */}
      {availableTeams.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-surface-800">可加入的团队</h2>
          <input
            type="text"
            placeholder="搜索团队名称或负责人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="space-y-3">
            {availableTeams
              .filter((t) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return t.name.toLowerCase().includes(q) || t.owner_name.toLowerCase().includes(q);
              })
              .map((team) => (
              <Card key={team.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-800">{team.name}</p>
                    <p className="text-sm text-surface-500">负责人：{team.owner_name}</p>
                  </div>
                  <Button size="sm" onClick={() => handleJoin(team.id)}>申请加入</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Owner: pending join requests for each team */}
      {Object.entries(ownedJoinReqs).map(([teamId, reqs]) =>
        reqs.length > 0 ? (
          <div key={teamId} className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-surface-800">
              待核审加入 — {teams.find((t) => t.id === Number(teamId))?.name || '团队'} ({reqs.length})
            </h2>
            <div className="space-y-3">
              {reqs.map((req) => (
                <Card key={req.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-semibold">
                        {req.requester_name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-surface-800">{req.requester_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApproveJoinFromList(req.id, Number(teamId), req.requester_name)}>同意</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRejectJoinFromList(req.id, Number(teamId))}>拒绝</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* Admin: pending team creation requests */}
      {user?.role === 'admin' && requests.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-surface-800">待审核的团队申请</h2>
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-800">{req.requester_name}</p>
                    <p className="text-sm text-surface-500">申请创建团队：{req.team_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(req.id)}>批准</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReject(req.id)}>拒绝</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="申请创建团队">
        <div className="space-y-4">
          <Input
            label="团队名称"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="输入团队名称"
          />
          <p className="text-sm text-surface-500">创建团队后你将自动成为团队负责人，需管理员审核通过后生效。</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleCreateRequest} isLoading={submitting}>提交申请</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
