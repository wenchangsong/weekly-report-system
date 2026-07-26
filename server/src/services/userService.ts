import db from '../db/connection';
import bcrypt from 'bcryptjs';
import { UserRow } from '../types';

export function listUsers() {
  return db.prepare(
    'SELECT id, username, email, role, supervisor_id, avatar_url, created_at FROM users ORDER BY id'
  ).all();
}

export function getSubordinates(supervisorId: number) {
  return db.prepare(
    'SELECT id, username, email, role, avatar_url FROM users WHERE supervisor_id = ? ORDER BY username'
  ).all(supervisorId);
}

export function updateUser(id: number, input: {
  username?: string;
  email?: string;
  password?: string;
  supervisorId?: number | null;
  avatarUrl?: string;
}) {
  const fields: string[] = [];
  const values: any[] = [];

  if (input.username) { fields.push('username = ?'); values.push(input.username); }
  if (input.email) { fields.push('email = ?'); values.push(input.email); }
  if (input.password) {
    fields.push('password_hash = ?');
    values.push(bcrypt.hashSync(input.password, 10));
  }
  if (input.supervisorId !== undefined) { fields.push('supervisor_id = ?'); values.push(input.supervisorId); }
  if (input.avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(input.avatarUrl); }

  if (fields.length === 0) return null;

  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return db.prepare(
    'SELECT id, username, email, role, supervisor_id, avatar_url, created_at FROM users WHERE id = ?'
  ).get(id);
}

export function getSupervisors() {
  return db.prepare(
    "SELECT id, username, email, avatar_url FROM users WHERE role IN ('admin', 'manager') ORDER BY username"
  ).all();
}
