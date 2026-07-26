import cron from 'node-cron';
import db from '../db/connection';
import { sendEmail } from '../email/transporter';
import { ReminderRow } from '../types';

export function startReminderJobs(): void {
  const reminders = db.prepare('SELECT * FROM reminders WHERE enabled = 1').all() as ReminderRow[];

  for (const reminder of reminders) {
    if (!cron.validate(reminder.cron_expression)) {
      console.warn(`[Reminder #${reminder.id}] Invalid cron: ${reminder.cron_expression}`);
      continue;
    }

    cron.schedule(reminder.cron_expression, async () => {
      console.log(`[Reminder #${reminder.id}] Triggered: ${reminder.title}`);

      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd();

      const users = db.prepare(`
        SELECT u.id, u.username, u.email FROM users u
        WHERE u.id NOT IN (
          SELECT user_id FROM reports WHERE week_start = ? AND status = 'submitted'
        )
      `).all(weekStart) as { id: number; username: string; email: string }[];

      for (const user of users) {
        const text = reminder.message_template
          .replace(/\{\{username\}\}/g, user.username)
          .replace(/\{\{week_start\}\}/g, weekStart)
          .replace(/\{\{week_end\}\}/g, weekEnd);

        try {
          await sendEmail({ to: user.email, subject: reminder.title, text });
        } catch (err) {
          console.error(`Failed to send reminder to ${user.email}:`, err);
        }
      }

      db.prepare("UPDATE reminders SET last_triggered_at = datetime('now') WHERE id = ?").run(reminder.id);
    });

    console.log(`[Reminder] "${reminder.title}" scheduled: ${reminder.cron_expression}`);
  }

  console.log(`Started ${reminders.length} reminder job(s)`);
}

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return fmtLocal(d);
}

function getWeekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff + 6);
  return fmtLocal(d);
}
