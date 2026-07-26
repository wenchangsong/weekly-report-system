import db from '../db/connection';
import { ReportRow } from '../types';

interface CreateReportInput {
  userId: number;
  weekStart: string;
  weekEnd: string;
  workDone: string;
  planNext: string;
  issues: string;
  teamId?: number;
  status?: 'draft' | 'submitted';
}

interface ListFilters {
  userId?: number;
  supervisorId?: number;
  teamId?: number;
  viewerId?: number;
  weekStart?: string;
  weekEnd?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function createReport(input: CreateReportInput) {
  const result = db.prepare(`
    INSERT INTO reports (user_id, week_start, week_end, work_done, plan_next, issues, status, team_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.userId, input.weekStart, input.weekEnd, input.workDone, input.planNext, input.issues, input.status || 'draft', input.teamId || null);

  return result.lastInsertRowid;
}

export function updateReport(id: number, userId: number, input: Partial<CreateReportInput>) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(id, userId) as ReportRow | undefined;
  if (!report) {
    throw new Error('周报不存在');
  }
  if (report.status === 'submitted') {
    throw new Error('已提交的周报不可编辑');
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (input.workDone !== undefined) { fields.push('work_done = ?'); values.push(input.workDone); }
  if (input.planNext !== undefined) { fields.push('plan_next = ?'); values.push(input.planNext); }
  if (input.issues !== undefined) { fields.push('issues = ?'); values.push(input.issues); }
  if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }

  fields.push("updated_at = datetime('now')");
  values.push(id, userId);

  db.prepare(`UPDATE reports SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
  return db.prepare(
    'SELECT r.*, u.username, u.avatar_url FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?'
  ).get(id);
}

export function reviewReport(id: number, reviewerId: number) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
  if (!report) throw new Error('周报不存在');
  if (report.status !== 'submitted') throw new Error('只能审核已提交的周报');

  db.prepare(`
    UPDATE reports SET reviewed = 1, reviewed_at = datetime('now'), reviewed_by = ?
    WHERE id = ?
  `).run(reviewerId, id);

  return db.prepare(
    'SELECT r.*, u.username, u.avatar_url FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?'
  ).get(id);
}

export function retractReport(id: number, userId: number) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(id, userId) as ReportRow | undefined;
  if (!report) throw new Error('周报不存在');
  if (report.status !== 'submitted') throw new Error('只能撤回已提交的周报');
  if (report.reviewed === 1) throw new Error('已审核的周报不可撤回');

  db.prepare("UPDATE reports SET status = 'draft', updated_at = datetime('now') WHERE id = ?").run(id);
  return db.prepare(
    'SELECT r.*, u.username, u.avatar_url FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?'
  ).get(id);
}

export function rejectReport(id: number, reviewerId: number) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
  if (!report) throw new Error('周报不存在');
  if (report.status !== 'submitted') throw new Error('只能驳回已提交的周报');
  if (report.reviewed === 1) throw new Error('已审核的周报不可驳回');

  db.prepare("UPDATE reports SET status = 'draft', reviewed = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  return db.prepare(
    'SELECT r.*, u.username, u.avatar_url FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?'
  ).get(id);
}

export function deleteReport(id: number, userId: number) {
  // Author can delete own unreviewed reports
  const asAuthor = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(id, userId) as ReportRow | undefined;
  if (asAuthor && asAuthor.reviewed === 0) {
    db.prepare('DELETE FROM reports WHERE id = ?').run(id);
    return;
  }

  // Team owner can delete reviewed reports in their own team
  const report = db.prepare('SELECT r.*, u.username FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(id) as any;
  if (!report) throw new Error('周报不存在');

  if (report.reviewed === 1 && report.team_id) {
    const isOwner = db.prepare(
      "SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'owner'"
    ).get(report.team_id, userId);
    if (isOwner) {
      db.prepare('DELETE FROM reports WHERE id = ?').run(id);
      return;
    }
  }

  throw new Error('无权删除该周报');
}

export function getReportById(id: number, viewerId?: number) {
  const report = db.prepare(
    'SELECT r.*, u.username, u.avatar_url FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?'
  ).get(id) as any;

  // Block supervisors from viewing other users' drafts
  if (report && viewerId && report.status === 'draft' && report.user_id !== viewerId) {
    return null;
  }
  return report;
}

export function listReports(filters: ListFilters = {}) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.userId) {
    conditions.push('r.user_id = ?');
    params.push(filters.userId);
  }
  if (filters.teamId) {
    // Match reports with this team_id OR legacy reports from team members (team_id IS NULL)
    conditions.push(`(r.team_id = ? OR (r.team_id IS NULL AND r.user_id IN (SELECT user_id FROM team_members WHERE team_id = ?)))`);
    params.push(filters.teamId, filters.teamId);
  }
  if (filters.supervisorId) {
    conditions.push('u.supervisor_id = ?');
    params.push(filters.supervisorId);
  }

  // Always hide other users' drafts. Only show drafts if viewer is looking at their own reports exclusively.
  if (filters.viewerId && !filters.userId) {
    conditions.push("(r.status != 'draft' OR r.user_id = ?)");
    params.push(filters.viewerId);
  } else if (filters.viewerId && filters.userId && filters.userId !== filters.viewerId) {
    conditions.push("r.status != 'draft'");
  }

  if (filters.weekStart) {
    conditions.push('r.week_start >= ?');
    params.push(filters.weekStart);
  }
  if (filters.weekEnd) {
    conditions.push('r.week_end <= ?');
    params.push(filters.weekEnd);
  }
  if (filters.status) {
    conditions.push('r.status = ?');
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM reports r JOIN users u ON r.user_id = u.id ${where}`
  ).get(...params) as { total: number };

  const rows = db.prepare(`
    SELECT r.*, u.username, u.avatar_url
    FROM reports r JOIN users u ON r.user_id = u.id
    ${where}
    ORDER BY r.week_start DESC, r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { rows, total, limit, offset };
}

export function getReportStats(userId: number) {
  const thisWeek = getWeekRange();

  const myTotal = db.prepare(
    'SELECT COUNT(*) as count FROM reports WHERE user_id = ?'
  ).get(userId) as { count: number };

  const thisWeekReport = db.prepare(
    'SELECT id, status FROM reports WHERE user_id = ? AND week_start = ?'
  ).get(userId, thisWeek.start) as { id: number; status: string } | undefined;

  const pendingReview = db.prepare(`
    SELECT COUNT(*) as count FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE u.supervisor_id = ? AND r.status = 'submitted' AND r.reviewed = 0
  `).get(userId) as { count: number };

  return {
    myTotal: myTotal.count,
    thisWeekSubmitted: thisWeekReport?.status === 'submitted',
    thisWeekReportId: thisWeekReport?.id || null,
    pendingReview: pendingReview.count,
  };
}

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekRange(dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: fmtLocal(monday), end: fmtLocal(sunday) };
}

export function getReportsForExport(filters: ListFilters = {}) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.userId) { conditions.push('r.user_id = ?'); params.push(filters.userId); }
  if (filters.teamId) { conditions.push('r.team_id = ?'); params.push(filters.teamId); }
  if (filters.weekStart) { conditions.push('r.week_start >= ?'); params.push(filters.weekStart); }
  if (filters.weekEnd) { conditions.push('r.week_end <= ?'); params.push(filters.weekEnd); }
  if (filters.status) { conditions.push('r.status = ?'); params.push(filters.status); }

  // Hide others' drafts
  if (filters.viewerId) {
    conditions.push("(r.status != 'draft' OR r.user_id = ?)");
    params.push(filters.viewerId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT r.week_start, r.week_end, u.username, u.email,
           r.work_done, r.plan_next, r.issues, r.status, r.created_at
    FROM reports r JOIN users u ON r.user_id = u.id
    ${where}
    ORDER BY r.week_start DESC, u.username
  `).all(...params) as any[];

  // Strip HTML tags for human-readable Excel export
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  return rows.map((r) => ({
    ...r,
    work_done: stripHtml(r.work_done),
    plan_next: stripHtml(r.plan_next),
    issues: stripHtml(r.issues),
  }));
}
