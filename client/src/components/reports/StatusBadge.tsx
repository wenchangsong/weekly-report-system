import { Badge } from '../ui/Badge';
import { STATUS_COLORS } from '../../utils/constants';

export function StatusBadge({ status, reviewed }: { status: string; reviewed?: number }) {
  if (reviewed === 1) {
    return <Badge className="bg-green-100 text-green-800">已审核</Badge>;
  }
  const labels: Record<string, string> = { draft: '草稿', submitted: '已提交' };
  return (
    <Badge className={STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}>
      {labels[status] || status}
    </Badge>
  );
}
