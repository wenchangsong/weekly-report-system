import { useEffect, useState } from 'react';
import { getReminders, createReminder, updateReminder, deleteReminder } from '../api/reminders';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { Reminder } from '../types';

export default function AdminRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  // Form state
  const [cronExpression, setCronExpression] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');

  const loadReminders = async () => {
    try {
      const data = await getReminders();
      setReminders(data);
    } catch {
      addToast('加载提醒配置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReminders(); }, []);

  const openCreate = () => {
    setEditing(null);
    setCronExpression('0 17 * * 5');
    setEnabled(true);
    setTitle('');
    setMessageTemplate('您好 {{username}}，本周（{{week_start}} ~ {{week_end}}）的周报尚未提交，请及时填写。');
    setModalOpen(true);
  };

  const openEdit = (r: Reminder) => {
    setEditing(r);
    setCronExpression(r.cron_expression);
    setEnabled(!!r.enabled);
    setTitle(r.title);
    setMessageTemplate(r.message_template);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!cronExpression || !title || !messageTemplate) {
      addToast('请填写所有必填项', 'error');
      return;
    }
    try {
      if (editing) {
        await updateReminder(editing.id, { cron_expression: cronExpression, enabled, title, message_template: messageTemplate });
        addToast('提醒更新成功', 'success');
      } else {
        await createReminder({ cron_expression: cronExpression, enabled, title, message_template: messageTemplate });
        addToast('提醒创建成功', 'success');
      }
      setModalOpen(false);
      loadReminders();
    } catch {
      addToast('保存失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个提醒吗？')) return;
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      addToast('提醒已删除', 'success');
    } catch {
      addToast('删除失败', 'error');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState title="无访问权限" description="仅管理员可以管理提醒配置" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-800">定时提醒</h1>
        <Button size="sm" onClick={openCreate}>新建提醒</Button>
      </div>

      {loading ? (
        <p className="text-sm text-surface-400">加载中...</p>
      ) : reminders.length === 0 ? (
        <EmptyState title="暂无提醒配置" description="点击「新建提醒」添加定时任务" />
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-surface-800">{r.title}</h3>
                    <Badge className={r.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {r.enabled ? '启用' : '停用'}
                    </Badge>
                  </div>
                  <p className="text-sm text-surface-500 mt-1">Cron: {r.cron_expression}</p>
                  <p className="text-sm text-surface-500 mt-1">模板: {r.message_template}</p>
                  {r.last_triggered_at && (
                    <p className="text-xs text-surface-400 mt-1">上次触发: {r.last_triggered_at}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>编辑</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>删除</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '编辑提醒' : '新建提醒'}>
        <div className="space-y-4">
          <Input label="标题" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="周报提交提醒" />
          <Input label="Cron 表达式" value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} placeholder="0 17 * * 5" />
          <p className="text-xs text-surface-400 -mt-2">
            格式：分 时 日 月 周。例如 0 17 * * 5 = 每周五 17:00
          </p>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded" />
            <label htmlFor="enabled" className="text-sm text-surface-700">启用</label>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-surface-700">消息模板</label>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-surface-400">
              可用变量：{'\{\{username\}\}'}, {'\{\{week_start\}\}'}, {'\{\{week_end\}\}'}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
