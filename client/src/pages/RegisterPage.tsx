import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { register } from '../api/auth';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      addToast('请填写所有必填项', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await register({ username, email, password });
      setAuth(data.user, data.token);
      addToast('注册成功', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      addToast(err.response?.data?.error || '注册失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-surface-800">创建账号</h1>
          <p className="text-sm text-surface-500 mt-1">注册周报系统账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="你的名字"
            autoFocus
          />
          <Input
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少6位"
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            注册
          </Button>
        </form>

        <p className="text-sm text-center text-surface-500 mt-4">
          已有账号？{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            去登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
