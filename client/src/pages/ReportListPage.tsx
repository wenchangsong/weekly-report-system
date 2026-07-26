import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getReports, downloadExport } from '../api/reports';
import { ReportCard } from '../components/reports/ReportCard';
import { ReportFilters } from '../components/reports/ReportFilters';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useUIStore } from '../stores/uiStore';
import type { Report } from '../types';

export default function ReportListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const activeTeamId = useUIStore((s) => s.activeTeamId);

  const [filters, setFilters] = useState({
    week_start: searchParams.get('week_start') || '',
    week_end: searchParams.get('week_end') || '',
    status: searchParams.get('status') || '',
  });

  const [page, setPage] = useState(0);
  const limit = 12;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset: page * limit };
      if (activeTeamId) params.team_id = activeTeamId;
      if (filters.week_start) params.week_start = filters.week_start;
      if (filters.week_end) params.week_end = filters.week_end;
      if (filters.status) params.status = filters.status;
      const data = await getReports(params);
      setReports(data.rows);
      setTotal(data.total);
    } catch {
      addToast('加载周报失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page, activeTeamId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleReset = () => {
    setFilters({ week_start: '', week_end: '', status: '' });
    setPage(0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport({ ...filters, team_id: activeTeamId || undefined });
      addToast('导出成功', 'success');
    } catch {
      addToast('导出失败', 'error');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-800">周报列表</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport} isLoading={exporting}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            导出 Excel
          </Button>
          <Link to="/reports/new">
            <Button size="sm">写周报</Button>
          </Link>
        </div>
      </div>

      <ReportFilters filters={filters} onChange={setFilters} onReset={handleReset} />

      {loading ? (
        <p className="text-sm text-surface-400">加载中...</p>
      ) : reports.length === 0 ? (
        <EmptyState
          title="暂无周报"
          description="还没有符合条件的周报记录"
          action={<Link to="/reports/new"><Button size="sm">写第一篇周报</Button></Link>}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <span className="text-sm text-surface-500 py-1.5">
                {page + 1} / {totalPages}
              </span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
