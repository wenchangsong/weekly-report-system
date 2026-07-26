import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useUIStore } from '../../stores/uiStore';
import { createReport, updateReport } from '../../api/reports';
import { getMyTeams } from '../../api/teams';
import RichTextEditor from './RichTextEditor';
import type { Report } from '../../types';
import { getCurrentWeekRange } from '../../utils/date';

interface ReportFormProps {
  report?: Report;
}

export function ReportForm({ report }: ReportFormProps) {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const activeTeamId = useUIStore((s) => s.activeTeamId);
  const isEdit = !!report;

  const [weekStart, setWeekStart] = useState(report?.week_start || getCurrentWeekRange().start);
  const [weekEnd, setWeekEnd] = useState(report?.week_end || getCurrentWeekRange().end);
  const [hasTeams, setHasTeams] = useState(true);
  const [checkingTeams, setCheckingTeams] = useState(true);
  const [content, setContent] = useState(report?.work_done || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyTeams().then((teams) => {
      setHasTeams(teams.length > 0);
      setCheckingTeams(false);
    }).catch(() => setCheckingTeams(false));
  }, []);

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (!weekStart || !weekEnd) {
      addToast('请填写日期范围', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = {
        week_start: weekStart,
        week_end: weekEnd,
        work_done: content,
        plan_next: '',
        issues: '',
        team_id: activeTeamId || undefined,
        status,
      };
      if (isEdit && report) {
        await updateReport(report.id, data);
        addToast('周报更新成功', 'success');
      } else {
        await createReport(data);
        addToast('周报创建成功', 'success');
      }
      navigate('/reports');
    } catch (err: any) {
      addToast(err.response?.data?.error || '操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (checkingTeams) return null;
  if (!hasTeams) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-surface-500 mb-4">你需要先加入一个团队才能写周报</p>
        <Button onClick={() => navigate('/teams')}>去加入团队</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-surface-800 mb-4">
          {isEdit ? '编辑周报' : '新建周报'}
        </h1>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input label="周开始日期" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          <Input label="周结束日期" type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
        </div>

        <RichTextEditor
          editorId="rte-content"
          initialValue={report?.work_done}
          placeholder="编写本周周报内容..."
          onChange={setContent}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 mt-4">
          <Button variant="secondary" onClick={() => handleSave('draft')} isLoading={saving}>保存草稿</Button>
          <Button onClick={() => handleSave('submitted')} isLoading={saving}>提交周报</Button>
        </div>
      </Card>
    </div>
  );
}
