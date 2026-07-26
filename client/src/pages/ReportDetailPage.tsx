import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getReport, deleteReport, reviewReport, rejectReport, retractReport } from '../api/reports';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/reports/StatusBadge';
import { CommentList } from '../components/comments/CommentList';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { Report } from '../types';
import { formatDate, formatWeekLabel } from '../utils/date';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    getReport(Number(id))
      .then(setReport)
      .catch(() => addToast('加载周报失败', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRetract = async () => {
    try { setReport(await retractReport(Number(id))); addToast('已撤回', 'success'); }
    catch (err: any) { addToast(err.response?.data?.error || '撤回失败', 'error'); }
  };

  const handleReject = async () => {
    try { setReport(await rejectReport(Number(id))); addToast('已打回', 'success'); }
    catch (err: any) { addToast(err.response?.data?.error || '驳回失败', 'error'); }
  };

  const handleReview = async () => {
    try { setReport(await reviewReport(Number(id))); addToast('审核通过', 'success'); }
    catch (err: any) { addToast(err.response?.data?.error || '审核失败', 'error'); }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这份周报吗？')) return;
    try { await deleteReport(Number(id)); addToast('已删除', 'success'); navigate('/reports'); }
    catch (err: any) { addToast(err.response?.data?.error || '删除失败', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!report) return <p className="text-center text-surface-500 py-16">周报不存在</p>;

  const isOwner = user?.id === report.user_id;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-800">
            {formatWeekLabel(report.week_start, report.week_end)}
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            {report.username} &middot; {formatDate(report.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={report.status} reviewed={report.reviewed} />
          {user && user.role !== 'member' && report.status === 'submitted' && report.reviewed === 0 && (
            <>
              <Button variant="primary" size="sm" onClick={handleReview}>审核通过</Button>
              <Button variant="secondary" size="sm" onClick={handleReject}>打回</Button>
            </>
          )}
          {isOwner && report.status === 'submitted' && report.reviewed === 0 && (
            <Button variant="secondary" size="sm" onClick={handleRetract}>撤回</Button>
          )}
          {isOwner && report.status === 'draft' && (
            <>
              <Link to={`/reports/${report.id}/edit`}><Button variant="secondary" size="sm">编辑</Button></Link>
              <Button variant="ghost" size="sm" onClick={handleDelete}>删除</Button>
            </>
          )}
          {user && user.role !== 'member' && report.reviewed === 1 && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>删除</Button>
          )}
        </div>
      </div>

      {/* Article body */}
      <Card>
        <div className="rte-content" dangerouslySetInnerHTML={{ __html: report.work_done || '<p style="color:#94a3b8">暂无内容</p>' }} />
      </Card>

      {/* Comments — only for submitted reports, not drafts */}
      {report.status !== 'draft' && <CommentList reportId={report.id} />}
    </div>
  );
}
