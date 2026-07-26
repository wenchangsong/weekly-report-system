import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface ReportFiltersProps {
  filters: {
    week_start: string;
    week_end: string;
    status: string;
  };
  onChange: (filters: any) => void;
  onReset: () => void;
  showUserFilter?: boolean;
  userFilter?: string;
  onUserFilterChange?: (val: string) => void;
}

export function ReportFilters({
  filters,
  onChange,
  onReset,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <Input
        label="开始日期"
        type="date"
        value={filters.week_start}
        onChange={(e) => onChange({ ...filters, week_start: e.target.value })}
        className="w-40"
      />
      <Input
        label="结束日期"
        type="date"
        value={filters.week_end}
        onChange={(e) => onChange({ ...filters, week_end: e.target.value })}
        className="w-40"
      />
      <Select
        label="状态"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        options={[
          { value: '', label: '全部' },
          { value: 'draft', label: '草稿' },
          { value: 'submitted', label: '已提交' },
        ]}
        className="w-32"
      />
      <Button variant="ghost" size="sm" onClick={onReset}>
        重置
      </Button>
    </div>
  );
}
