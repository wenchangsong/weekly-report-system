import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { StatusBadge } from './StatusBadge';
import type { Report } from '../../types';
import { formatDate, formatWeekLabel } from '../../utils/date';

function stripHtml(html: string) {
  if (!html) return '暂无内容';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function ReportCard({ report }: { report: Report }) {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/reports/${report.id}`)} className="hover:border-primary-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-surface-800">
            {formatWeekLabel(report.week_start, report.week_end)}
          </h3>
          <p className="text-sm text-surface-500 mt-0.5">
            {report.username} &middot; {formatDate(report.created_at)}
          </p>
        </div>
        <StatusBadge status={report.status} reviewed={report.reviewed} />
      </div>
      <p className="text-sm text-surface-600 line-clamp-2">
        {stripHtml(report.work_done)}
      </p>
    </Card>
  );
}
