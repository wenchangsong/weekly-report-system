import { useState, useEffect } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { updateUser } from '../api/users';
import { getMyTeams, type Team } from '../api/teams';
import { ROLE_LABELS } from '../utils/constants';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const addToast = useUIStore((s) => s.addToast);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
    getMyTeams().then(setTeams).catch(() => {});
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await updateUser(user.id, {
        username,
        email,
        password: password || undefined,
        old_password: oldPassword || undefined,
      } as any);
      if (token) setAuth(updated, token);
      setPassword('');
      setOldPassword('');
      addToast('个人信息更新成功', 'success');
    } catch {
      addToast('更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-surface-800">个人设置</h1>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-surface-100">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-lg font-semibold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-surface-800">{user?.username}</p>
              <p className="text-sm text-surface-500">{ROLE_LABELS[user?.role || 'member']}</p>
            </div>
          </div>

          <Input label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="旧密码（修改密码时必填）" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="不修改密码则留空" />
          <Input label="新密码（留空不修改）" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="留空则不修改" />

          <Button onClick={handleSave} isLoading={saving} className="w-full">
            保存修改
          </Button>
        </div>
      </Card>

      {/* Team memberships */}
      <Card>
        <h2 className="font-semibold text-surface-800 mb-4">我的团队</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-surface-400">暂未加入任何团队</p>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                <span className="text-sm font-medium text-surface-700">{team.name}</span>
                <span className="text-xs text-surface-400">{team.my_role === 'owner' ? '团队负责人' : '成员'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}
