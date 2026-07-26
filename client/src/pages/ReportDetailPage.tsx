import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getReport, deleteReport, reviewReport, rejectReport, retractReport } from '../api/reports';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/reports/StatusBadge';
import { CommentList } from '../components/comments/CommentList';
import { Spinner } from '../components/ui/Spinner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    try {
      const updated = await retractReport(Number(id));
      setReport(updated);
      addToast('周报已撤回，可重新编辑', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || '撤回失败', 'error');
    }
  };

  const handleReject = async () => {
    try {
      const updated = await rejectReport(Number(id));
      setReport(updated);
      addToast('已打回，状态退回草稿', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || '驳回失败', 'error');
    }
  };

  const handleReview = async () => {
    try {
      const updated = await reviewReport(Number(id));
      setReport(updated);
      addToast('审核通过', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || '审核失败', 'error');
    }
  };

  const handleDelete = async () => {
    const msg = report?.reviewed ? '确定要删除这份已审核的周报吗？' : '确定要删除这份周报吗？';
    if (!confirm(msg)) return;
    try {
      await deleteReport(Number(id));
      addToast('周报已删除', 'success');
      navigate('/reports');
    } catch (err: any) {
      addToast(err.response?.data?.error || '删除失败', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!report) return <p className="text-surface-500 text-center py-16">周报不存在</p>;

  const isOwner = user?.id === report.user_id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
              <Link to={`/reports/${report.id}/edit`}>
                <Button variant="secondary" size="sm">编辑</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleDelete}>删除</Button>
            </>
          )}
          {user && user.role !== 'member' && report.reviewed === 1 && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>删除</Button>
          )}
        </div>
      </div>

      <Card>
        <h3 className="font-medium text-surface-700 mb-2">本周完成工作</h3>
        <div className="prose prose-sm max-w-none text-surface-600">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.work_done || '暂无'}</ReactMarkdown>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium text-surface-700 mb-2">下周工作计划</h3>
        <div className="prose prose-sm max-w-none text-surface-600">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.plan_next || '暂无'}</ReactMarkdown>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium text-surface-700 mb-2">问题与风险</h3>
        <div className="prose prose-sm max-w-none text-surface-600">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.issues || '暂无'}</ReactMarkdown>
        </div>
      </Card>

      <CommentList reportId={report.id} />
    </div>
  );
}
