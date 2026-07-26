import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useUIStore } from '../../stores/uiStore';
import { createReport, updateReport } from '../../api/reports';
import { getMyTeams } from '../../api/teams';
import client from '../../api/client';
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

  const [weekStart, setWeekStart] = useState(
    report ? report.week_start : getCurrentWeekRange().start
  );
  const [weekEnd, setWeekEnd] = useState(
    report ? report.week_end : getCurrentWeekRange().end
  );
  const [workDone, setWorkDone] = useState(report?.work_done || '');
  const [planNext, setPlanNext] = useState(report?.plan_next || '');
  const [issues, setIssues] = useState(report?.issues || '');
  const [hasTeams, setHasTeams] = useState(true);
  const [checkingTeams, setCheckingTeams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeField, setActiveField] = useState<'workDone' | 'planNext' | 'issues'>('workDone');
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyTeams().then((teams) => {
      setHasTeams(teams.length > 0);
      setCheckingTeams(false);
    }).catch(() => setCheckingTeams(false));
  }, []);

  const getActiveContent = () => {
    if (activeField === 'workDone') return workDone;
    if (activeField === 'planNext') return planNext;
    return issues;
  };

  const setActiveContent = (val: string) => {
    if (activeField === 'workDone') setWorkDone(val);
    else if (activeField === 'planNext') setPlanNext(val);
    else setIssues(val);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post('/upload', formData);
      const md = `![${file.name}](${res.data.url})`;
      setActiveContent(getActiveContent() + '\n' + md + '\n');
      addToast('图片上传成功', 'success');
    } catch {
      addToast('图片上传失败', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (!weekStart || !weekEnd) {
      addToast('请填写日期范围', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = { week_start: weekStart, week_end: weekEnd, work_done: workDone, plan_next: planNext, issues, team_id: activeTeamId || undefined, status };
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
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-surface-500 mb-4">你需要先加入一个团队才能写周报</p>
        <Button onClick={() => navigate('/teams')}>去加入团队</Button>
      </div>
    );
  }

  const tabs = [
    { key: 'workDone' as const, label: '本周完成工作' },
    { key: 'planNext' as const, label: '下周工作计划' },
    { key: 'issues' as const, label: '问题与风险' },
  ];

  const activeContent = getActiveContent();

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-surface-800">
            {isEdit ? '编辑周报' : '新建周报'}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input label="周开始日期" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          <Input label="周结束日期" type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-4 border-b border-surface-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveField(t.key); setPreviewTab('edit'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeField === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => setPreviewTab(previewTab === 'edit' ? 'preview' : 'edit')}
            className={`px-2 py-1 text-xs rounded ${previewTab === 'preview' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
          >
            {previewTab === 'edit' ? '预览' : '编辑'}
          </button>
          <span className="w-px h-5 bg-surface-200 mx-1" />
          <button type="button" onClick={() => setUploading(false)} className="px-2 py-1 text-xs rounded bg-surface-100 text-surface-600 hover:bg-surface-200" title="上传图片" onClickCapture={() => fileInputRef.current?.click()}>
            {uploading ? '上传中...' : '🖼 图片'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>

        {/* Editor / Preview */}
        {previewTab === 'edit' ? (
          <textarea
            value={activeContent}
            onChange={(e) => setActiveContent(e.target.value)}
            placeholder="使用 Markdown 格式编写...&#10;&#10;# 标题&#10;**粗体**&#10;- 列表项&#10;![图片](url)"
            rows={18}
            className="w-full px-4 py-3 rounded-lg border border-surface-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
          />
        ) : (
          <div className="w-full px-4 py-3 rounded-lg border border-surface-200 bg-white min-h-[400px] prose prose-sm max-w-none">
            {activeContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeContent}
              </ReactMarkdown>
            ) : (
              <p className="text-surface-400 text-sm">暂无内容</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 mt-4">
          <Button variant="secondary" onClick={() => handleSave('draft')} isLoading={saving}>保存草稿</Button>
          <Button onClick={() => handleSave('submitted')} isLoading={saving}>提交周报</Button>
        </div>
      </Card>
    </div>
  );
}
