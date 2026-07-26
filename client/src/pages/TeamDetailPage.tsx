import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeamDetail, removeMember, leaveTeam, deleteTeam, getJoinRequests, approveJoinRequest, rejectJoinRequest, getMembersWithoutReport, type Team, type TeamMember, type TeamRequest } from '../api/teams';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<TeamRequest[]>([]);
  const [missingMembers, setMissingMembers] = useState<{ id: number; username: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const triggerTeamRefresh = useUIStore((s) => s.triggerTeamRefresh);
  const isOwner = team?.owner_id === user?.id;

  const loadMembers = useCallback(async () => {
    const data = await getTeamDetail(teamId);
    setTeam(data.team);
    setMembers(data.members);
  }, [teamId]);

  const loadJoinRequests = useCallback(async () => {
    try {
      const jr = await getJoinRequests(teamId);
      setJoinRequests(Array.isArray(jr) ? jr : []);
    } catch {
      setJoinRequests([]);
    }
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await getTeamDetail(teamId);
        if (cancelled) return;
        setTeam(data.team);
        setMembers(data.members);
        // Load join requests separately so failure doesn't block page
        const jr = await getJoinRequests(teamId).catch(() => []);
        if (!cancelled) setJoinRequests(Array.isArray(jr) ? jr : []);
        const mm = await getMembersWithoutReport(teamId).catch(() => []);
        if (!cancelled) setMissingMembers(Array.isArray(mm) ? mm : []);
      } catch (err: any) {
        if (!cancelled) setLoadError(err.response?.data?.error || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [teamId]);

  const handleRemove = async (memberId: number) => {
    if (!confirm('确定要移除该成员吗？')) return;
    try {
      await removeMember(teamId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      addToast('已移除', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleLeave = async () => {
    if (!confirm('确定要退出该团队吗？')) return;
    try {
      await leaveTeam(teamId);
      triggerTeamRefresh();
      addToast('已退出团队', 'success');
      navigate('/teams');
    } catch (err: any) {
      addToast(err.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除该团队吗？所有成员将被移除。')) return;
    try {
      await deleteTeam(teamId);
      triggerTeamRefresh();
      addToast('团队已删除', 'success');
      navigate('/teams');
    } catch (err: any) {
      addToast(err.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleApproveJoin = async (reqId: number, requesterName: string) => {
    if (!confirm(`确认批准「${requesterName}」加入团队？`)) return;
    try {
      await approveJoinRequest(reqId);
      // Reload all data
      await loadMembers();
      await loadJoinRequests();
      addToast(`已批准 ${requesterName} 加入团队`, 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || '审批失败', 'error');
    }
  };

  const handleRejectJoin = async (reqId: number) => {
    try {
      await rejectJoinRequest(reqId);
      setJoinRequests((prev) => prev.filter((r) => r.id !== reqId));
      addToast('已拒绝', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || '操作失败', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <p className="text-center py-16 text-surface-500">{loadError}</p>;
  if (!team) return <p className="text-center py-16 text-surface-500">团队不存在</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-800">{team.name}</h1>
          <p className="text-sm text-surface-500 mt-1">{members.length} 名成员</p>
        </div>
        <div className="flex gap-2">
          {isOwner && <Button variant="danger" size="sm" onClick={handleDelete}>删除团队</Button>}
          {!isOwner && <Button variant="ghost" size="sm" onClick={handleLeave}>退出团队</Button>}
        </div>
      </div>

      {isOwner && joinRequests.length > 0 && (
        <Card>
          <h2 className="font-semibold text-surface-800 mb-4">待核审的加入申请 ({joinRequests.length})</h2>
          <div className="space-y-3">
            {joinRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-semibold">
                    {req.requester_name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-medium text-surface-800 text-sm">{req.requester_name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApproveJoin(req.id, req.requester_name)}>同意</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRejectJoin(req.id)}>拒绝</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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

      <Card>
        <h2 className="font-semibold text-surface-800 mb-4">团队成员 ({members.length})</h2>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                  {member.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-surface-800 text-sm">{member.username}</p>
                  <p className="text-xs text-surface-400">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={member.team_role === 'owner' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}>
                  {member.team_role === 'owner' ? '负责人' : '成员'}
                </Badge>
                {isOwner && member.team_role !== 'owner' && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(member.id)}>移除</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
