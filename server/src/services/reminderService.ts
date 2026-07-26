import db from '../db/connection';
import { ReminderRow } from '../types';

export function listReminders() {
  return db.prepare('SELECT * FROM reminders ORDER BY id').all() as ReminderRow[];
}

export function createReminder(input: {
  cronExpression: string;
  enabled: boolean;
  title: string;
  messageTemplate: string;
}) {
  const result = db.prepare(`
    INSERT INTO reminders (cron_expression, enabled, title, message_template)
    VALUES (?, ?, ?, ?)
  `).run(input.cronExpression, input.enabled ? 1 : 0, input.title, input.messageTemplate);
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
}

export function updateReminder(id: number, input: Partial<{
  cronExpression: string;
  enabled: boolean;
  title: string;
  messageTemplate: string;
}>) {
  const fields: string[] = [];
  const values: any[] = [];

  if (input.cronExpression !== undefined) { fields.push('cron_expression = ?'); values.push(input.cronExpression); }
  if (input.enabled !== undefined) { fields.push('enabled = ?'); values.push(input.enabled ? 1 : 0); }
  if (input.title !== undefined) { fields.push('title = ?'); values.push(input.title); }
  if (input.messageTemplate !== undefined) { fields.push('message_template = ?'); values.push(input.messageTemplate); }

  if (fields.length === 0) return null;

  values.push(id);
  db.prepare(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
}

export function deleteReminder(id: number) {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
}
