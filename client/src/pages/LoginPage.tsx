import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { login } from '../api/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('请填写邮箱和密码', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.user, data.token);
      addToast('登录成功', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      addToast(err.response?.data?.error || '登录失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 7h.01M12 7h.01M16 7h.01M8 12h8M8 17h8" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-surface-800">周报系统</h1>
          <p className="text-sm text-surface-500 mt-1">登录你的账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            autoFocus
          />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            登录
          </Button>
        </form>

        <p className="text-sm text-center text-surface-500 mt-4">
          还没有账号？{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            立即注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
