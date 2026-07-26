import client from './client';
import type { User, SupervisorRequest } from '../types';

export async function getSupervisorRequests() {
  const res = await client.get('/users/supervisor-requests');
  return res.data as SupervisorRequest[];
}

export async function getSupervisorRequestCount() {
  const res = await client.get('/users/supervisor-requests/count');
  return res.data.count as number;
}

export async function approveRequest(id: number) {
  const res = await client.post(`/users/supervisor-requests/${id}/approve`);
  return res.data;
}

export async function rejectRequest(id: number) {
  const res = await client.post(`/users/supervisor-requests/${id}/reject`);
  return res.data;
}

export async function getUsers() {
  const res = await client.get('/users');
  return res.data as User[];
}

export async function getSubordinates() {
  const res = await client.get('/users/subordinates');
  return res.data as User[];
}

export async function getSupervisors() {
  const res = await client.get('/users/supervisors');
  return res.data as Pick<User, 'id' | 'username' | 'email' | 'avatar_url'>[];
}

export async function updateUser(id: number, data: Partial<{
  username: string;
  email: string;
  password: string;
  supervisorId: number | null;
  avatarUrl: string;
}>) {
  const res = await client.put(`/users/${id}`, data);
  return res.data as User;
}
