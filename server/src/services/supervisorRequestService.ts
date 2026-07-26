import db from '../db/connection';

export function getPendingRequests(supervisorId: number) {
  return db.prepare(`
    SELECT sr.*, u.username, s.username as supervisor_name
    FROM supervisor_requests sr
    JOIN users u ON sr.user_id = u.id
    JOIN users s ON sr.supervisor_id = s.id
    WHERE sr.supervisor_id = ? AND sr.status = 'pending'
    ORDER BY sr.created_at DESC
  `).all(supervisorId);
}

export function approveRequest(requestId: number, supervisorId: number) {
  const req = db.prepare(
    'SELECT * FROM supervisor_requests WHERE id = ? AND supervisor_id = ? AND status = ?'
  ).get(requestId, supervisorId, 'pending') as any;

  if (!req) throw new Error('请求不存在或已处理');

  db.prepare('UPDATE supervisor_requests SET status = ? WHERE id = ?').run('approved', requestId);
  db.prepare('UPDATE users SET supervisor_id = ? WHERE id = ?').run(supervisorId, req.user_id);

  return { success: true };
}

export function rejectRequest(requestId: number, supervisorId: number) {
  const req = db.prepare(
    'SELECT * FROM supervisor_requests WHERE id = ? AND supervisor_id = ? AND status = ?'
  ).get(requestId, supervisorId, 'pending') as any;

  if (!req) throw new Error('请求不存在或已处理');

  db.prepare('UPDATE supervisor_requests SET status = ? WHERE id = ?').run('rejected', requestId);
  return { success: true };
}

export function getPendingRequestCount(supervisorId: number) {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM supervisor_requests WHERE supervisor_id = ? AND status = ?'
  ).get(supervisorId, 'pending') as { count: number };
  return result.count;
}
