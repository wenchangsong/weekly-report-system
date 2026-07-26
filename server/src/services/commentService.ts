import db from '../db/connection';

export function getComments(reportId: number) {
  return db.prepare(`
    SELECT c.*, u.username, u.avatar_url
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.report_id = ?
    ORDER BY c.created_at ASC
  `).all(reportId);
}

export function createComment(reportId: number, userId: number, content: string) {
  const result = db.prepare(
    'INSERT INTO comments (report_id, user_id, content) VALUES (?, ?, ?)'
  ).run(reportId, userId, content);

  return db.prepare(
    'SELECT c.*, u.username, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?'
  ).get(result.lastInsertRowid);
}

export function deleteComment(commentId: number, userId: number) {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as any;
  if (!comment) {
    throw new Error('评论不存在');
  }
  if (comment.user_id !== userId) {
    throw new Error('只能删除自己的评论');
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
}
