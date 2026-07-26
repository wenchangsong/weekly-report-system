import { useEffect, useState } from 'react';
import { getSupervisorRequests, approveRequest, rejectRequest } from '../api/users';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useUIStore } from '../stores/uiStore';
import type { SupervisorRequest } from '../types';

export default function SupervisorRequestsPage() {
  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useUIStore((s) => s.addToast);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getSupervisorRequests();
      setRequests(data);
    } catch {
      addToast('加载请求失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleApprove = async (id: number) => {
    try {
      await approveRequest(id);
      addToast('已同意', 'success');
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      addToast('操作失败', 'error');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectRequest(id);
      addToast('已拒绝', 'success');
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      addToast('操作失败', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-surface-800">上级审批请求</h1>

      {loading ? (
        <p className="text-sm text-surface-400">加载中...</p>
      ) : requests.length === 0 ? (
        <EmptyState title="暂无待审批请求" description="当有成员选择你作为上级时，会在这里显示" />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                    {req.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-surface-800">{req.username}</p>
                    <p className="text-sm text-surface-500">申请你作为直属上级</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">待处理</Badge>
                  <Button size="sm" variant="primary" onClick={() => handleApprove(req.id)}>同意</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(req.id)}>拒绝</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
