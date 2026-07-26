import client from './client';
import type { User } from '../types';

export async function login(email: string, password: string) {
  const res = await client.post('/auth/login', { email, password });
  return res.data as { user: User; token: string };
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
  supervisor_id?: number | null;
}) {
  const res = await client.post('/auth/register', data);
  return res.data as { user: User; token: string };
}

export async function getMe() {
  const res = await client.get('/auth/me');
  return res.data as User;
}
