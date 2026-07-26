import bcrypt from 'bcryptjs';
import db from '../db/connection';
import { signToken } from '../middleware/auth';
import { UserRow } from '../types';

export function registerUser(input: {
  username: string;
  email: string;
  password: string;
  role?: string;
  supervisorId?: number | null;
}) {
  if (!input.password || input.password.length < 6) {
    throw new Error('密码至少6位');
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(input.username, input.email);
  if (existing) {
    throw new Error('用户名或邮箱已存在');
  }

  const hash = bcrypt.hashSync(input.password, 10);
  // Register user without supervisor_id — it will be set upon supervisor approval
  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, supervisor_id)
    VALUES (?, ?, ?, ?, NULL)
  `).run(input.username, input.email, hash, input.role || 'member');

  // If user selected a supervisor, create a pending request
  if (input.supervisorId) {
    db.prepare(`
      INSERT INTO supervisor_requests (user_id, supervisor_id, status)
      VALUES (?, ?, 'pending')
    `).run(result.lastInsertRowid, input.supervisorId);
  }

  const user = db.prepare('SELECT id, username, email, role, supervisor_id, avatar_url, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid) as Omit<UserRow, 'password_hash'>;

  const token = signToken({ userId: user.id, username: user.username, role: user.role as any });
  return { user, token };
}

export function loginUser(email: string, password: string) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!user) {
    throw new Error('邮箱或密码错误');
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    throw new Error('邮箱或密码错误');
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role as any });
  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token };
}

export function getUserById(userId: number) {
  return db.prepare(
    'SELECT id, username, email, role, supervisor_id, avatar_url, created_at FROM users WHERE id = ?'
  ).get(userId);
}
