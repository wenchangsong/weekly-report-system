import db from './connection';

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','manager','member')),
      supervisor_id INTEGER REFERENCES users(id),
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      work_done TEXT NOT NULL DEFAULT '',
      plan_next TEXT NOT NULL DEFAULT '',
      issues TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reports_user_week ON reports(user_id, week_start);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

    CREATE TABLE IF NOT EXISTS supervisor_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      supervisor_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_comments_report ON comments(report_id);

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cron_expression TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      message_template TEXT NOT NULL,
      last_triggered_at TEXT
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      owner_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','member')),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS team_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      type TEXT NOT NULL CHECK(type IN ('create','join')),
      team_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      reviewed_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add reviewed columns
  try { db.exec(`ALTER TABLE reports ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0`); } catch (_) {}
  try { db.exec(`ALTER TABLE reports ADD COLUMN reviewed_at TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE reports ADD COLUMN reviewed_by INTEGER REFERENCES users(id)`); } catch (_) {}
  try { db.exec(`ALTER TABLE reports ADD COLUMN team_id INTEGER REFERENCES teams(id)`); } catch (_) {}

  // Data migration: create teams from existing supervisor relationships
  const existingTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get() as { count: number };
  if (existingTeams.count === 0) {
    // Find all unique supervisors who have subordinates
    const supervisors = db.prepare(`
      SELECT DISTINCT s.id, s.username FROM users s
      JOIN users u ON u.supervisor_id = s.id
    `).all() as { id: number; username: string }[];

    for (const sup of supervisors) {
      const teamResult = db.prepare(
        'INSERT INTO teams (name, description, owner_id) VALUES (?, ?, ?)'
      ).run(`${sup.username}的团队`, '', sup.id);
      const teamId = teamResult.lastInsertRowid as number;

      // Add owner as team member
      db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(teamId, sup.id, 'owner');

      // Add all subordinates
      const subordinates = db.prepare(
        'SELECT id FROM users WHERE supervisor_id = ?'
      ).all(sup.id) as { id: number }[];

      for (const sub of subordinates) {
        db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(teamId, sub.id, 'member');
      }
    }
    console.log(`Migrated ${supervisors.length} supervisor(s) to teams`);
  }

  // Create default admin if no users exist
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (count.count === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('admin', 'admin@example.com', hash, 'admin');
    console.log('Default admin user created: admin / admin123');
  }

  // Create default reminder if none exists
  const reminderCount = db.prepare('SELECT COUNT(*) as count FROM reminders').get() as { count: number };
  if (reminderCount.count === 0) {
    db.prepare(`
      INSERT INTO reminders (cron_expression, enabled, title, message_template)
      VALUES (?, 1, ?, ?)
    `).run(
      '0 17 * * 5',
      '周报提交提醒',
      '您好 {{username}}，本周（{{week_start}}）的周报尚未提交，请及时登录系统填写。'
    );
    console.log('Default reminder created: Fridays at 5pm');
  }
}
