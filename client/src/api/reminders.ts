import client from './client';
import type { Reminder } from '../types';

export async function getReminders() {
  const res = await client.get('/reminders');
  return res.data as Reminder[];
}

export async function createReminder(data: {
  cron_expression: string;
  enabled: boolean;
  title: string;
  message_template: string;
}) {
  const res = await client.post('/reminders', data);
  return res.data as Reminder;
}

export async function updateReminder(id: number, data: Partial<{
  cron_expression: string;
  enabled: boolean;
  title: string;
  message_template: string;
}>) {
  const res = await client.put(`/reminders/${id}`, data);
  return res.data as Reminder;
}

export async function deleteReminder(id: number) {
  await client.delete(`/reminders/${id}`);
}
