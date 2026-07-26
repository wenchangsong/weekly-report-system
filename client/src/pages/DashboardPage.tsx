import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getReportStats } from '../api/reports';
import type { ReportStats } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReportStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-surface-400">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-surface-800">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-600">{stats?.myTotal ?? 0}</p>
          <p className="text-sm text-surface-500 mt-1">我的周报总数</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary-600">{stats?.pendingReview ?? 0}</p>
          <p className="text-sm text-surface-500 mt-1">待审核周报</p>
        </Card>
        <Card className="text-center">
          <div className={stats?.thisWeekSubmitted ? 'text-green-600' : 'text-yellow-600'}>
            <p className="text-3xl font-bold">
              {stats?.thisWeekSubmitted ? '已' : '未'}
            </p>
          </div>
          <p className="text-sm text-surface-500 mt-1">本周提交状态</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link to="/reports/new">
          <Button>写本周周报</Button>
        </Link>
        <Link to="/reports">
          <Button variant="secondary">查看历史</Button>
        </Link>
      </div>
    </div>
  );
}
