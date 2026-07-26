import db from '../db/connection';
import { getWeekRange } from './reportService';

export function getMyTeams(userId: number) {
  return db.prepare(`
    SELECT t.*, tm.role as my_role FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.created_at DESC
  `).all(userId);
}

export function getTeamById(teamId: number) {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
}

export function getTeamMembers(teamId: number) {
  return db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.avatar_url, tm.role as team_role, tm.joined_at
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.role DESC, tm.joined_at ASC
  `).all(teamId);
}

export function createTeam(name: string, ownerId: number, description: string = '') {
  const result = db.prepare(
    'INSERT INTO teams (name, description, owner_id) VALUES (?, ?, ?)'
  ).run(name, description, ownerId);

  const teamId = result.lastInsertRowid as number;
  db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(teamId, ownerId, 'owner');

  return db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
}

export function deleteTeam(teamId: number, userId: number, isAdmin?: boolean) {
  if (isAdmin) {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
    if (!team) throw new Error('团队不存在');
  } else {
    const team = db.prepare('SELECT * FROM teams WHERE id = ? AND owner_id = ?').get(teamId, userId) as any;
    if (!team) throw new Error('团队不存在或你不是团队负责人');
  }
  db.prepare('DELETE FROM team_requests WHERE team_id = ?').run(teamId);
  db.prepare('UPDATE reports SET team_id = NULL WHERE team_id = ?').run(teamId);
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
}

export function removeMember(teamId: number, memberId: number, requesterId: number) {
  const team = db.prepare('SELECT * FROM teams WHERE id = ? AND owner_id = ?').get(teamId, requesterId) as any;
  if (!team) throw new Error('只有团队负责人可以移除成员');
  if (memberId === requesterId) throw new Error('负责人不能移除自己');

  const result = db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, memberId);
  if (result.changes === 0) throw new Error('该成员不在团队中');

  // Also clear supervisor_id if this was their supervisor
  db.prepare('UPDATE users SET supervisor_id = NULL WHERE id = ? AND supervisor_id = ?').run(memberId, requesterId);
}

export function leaveTeam(teamId: number, userId: number) {
  const member = db.prepare(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND role != ?'
  ).get(teamId, userId, 'owner') as any;
  if (!member) throw new Error('团队负责人不能直接退出，请先转让或删除团队');

  db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, userId);

  // Clear supervisor_id
  const team = db.prepare('SELECT owner_id FROM teams WHERE id = ?').get(teamId) as any;
  if (team) {
    db.prepare('UPDATE users SET supervisor_id = NULL WHERE id = ? AND supervisor_id = ?').run(userId, team.owner_id);
  }
}

// Team request functions
export function createTeamRequest(requesterId: number, teamName: string) {
  const result = db.prepare(`
    INSERT INTO team_requests (requester_id, type, team_name, status)
    VALUES (?, 'create', ?, 'pending')
  `).run(requesterId, teamName);
  return db.prepare('SELECT * FROM team_requests WHERE id = ?').get(result.lastInsertRowid);
}

export function getPendingTeamRequests() {
  return db.prepare(`
    SELECT tr.*, u.username as requester_name
    FROM team_requests tr
    JOIN users u ON tr.requester_id = u.id
    WHERE tr.status = 'pending' AND tr.type = 'create'
    ORDER BY tr.created_at DESC
  `).all();
}

export function approveTeamRequest(requestId: number, reviewerId: number) {
  const req = db.prepare('SELECT * FROM team_requests WHERE id = ? AND status = ?').get(requestId, 'pending') as any;
  if (!req) throw new Error('请求不存在或已处理');

  if (req.type === 'create') {
    const team = createTeam(req.team_name || '新团队', req.requester_id);
    db.prepare('UPDATE team_requests SET status = ?, reviewed_by = ?, team_id = ? WHERE id = ?')
      .run('approved', reviewerId, (team as any).id, requestId);
    // Upgrade user role to manager
    db.prepare("UPDATE users SET role = 'manager' WHERE id = ? AND role = 'member'").run(req.requester_id);
  } else {
    db.prepare('UPDATE team_requests SET status = ?, reviewed_by = ? WHERE id = ?')
      .run('approved', reviewerId, requestId);
  }

  return { success: true };
}

export function rejectTeamRequest(requestId: number, reviewerId: number) {
  const req = db.prepare('SELECT * FROM team_requests WHERE id = ? AND status = ?').get(requestId, 'pending') as any;
  if (!req) throw new Error('请求不存在或已处理');
  db.prepare('UPDATE team_requests SET status = ?, reviewed_by = ? WHERE id = ?').run('rejected', reviewerId, requestId);
  return { success: true };
}

export function isUserInTeam(userId: number, teamId: number): boolean {
  const member = db.prepare(
    'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?'
  ).get(teamId, userId);
  return !!member;
}

export function getAvailableTeams(userId: number) {
  return db.prepare(`
    SELECT t.*, u.username as owner_name FROM teams t
    JOIN users u ON t.owner_id = u.id
    WHERE t.id NOT IN (
      SELECT team_id FROM team_members WHERE user_id = ?
    )
    ORDER BY t.created_at DESC
  `).all(userId);
}

// ============ JOIN TEAM FLOW (apply → approve → member) ============

export function requestJoinTeam(teamId: number, userId: number) {
  // 1. Check not already member
  const member = db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, userId);
  if (member) throw new Error('你已经是该团队成员');

  // 2. Check no duplicate pending
  const pending = db.prepare(
    "SELECT id FROM team_requests WHERE requester_id = ? AND team_id = ? AND type = 'join' AND status = 'pending'"
  ).get(userId, teamId);
  if (pending) throw new Error('你已经提交过加入申请，请等待核审');

  // 3. Create pending request
  const result = db.prepare(
    "INSERT INTO team_requests (requester_id, team_id, type, status) VALUES (?, ?, 'join', 'pending')"
  ).run(userId, teamId);
  return db.prepare('SELECT * FROM team_requests WHERE id = ?').get(result.lastInsertRowid);
}

export function getJoinRequests(teamId: number) {
  return db.prepare(`
    SELECT tr.*, u.username as requester_name
    FROM team_requests tr JOIN users u ON tr.requester_id = u.id
    WHERE tr.team_id = ? AND tr.type = 'join' AND tr.status = 'pending'
    ORDER BY tr.created_at ASC
  `).all(teamId);
}

export function approveJoinRequest(requestId: number, reviewerId: number) {
  // 1. Verify request exists and is pending
  const req = db.prepare(
    "SELECT * FROM team_requests WHERE id = ? AND type = 'join' AND status = 'pending'"
  ).get(requestId) as any;
  if (!req) throw new Error('请求不存在或已处理');

  // 2. Verify reviewer is team owner
  const owner = db.prepare(
    "SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'owner'"
  ).get(req.team_id, reviewerId);
  if (!owner) throw new Error('只有团队负责人可以审批');

  // 3. Mark request approved
  db.prepare('UPDATE team_requests SET status = ?, reviewed_by = ? WHERE id = ?')
    .run('approved', reviewerId, requestId);

  // 4. Add to team_members (use INSERT not INSERT OR IGNORE so errors surface)
  db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)')
    .run(req.team_id, req.requester_id, 'member');

  // 5. Set supervisor
  db.prepare('UPDATE users SET supervisor_id = ? WHERE id = ?')
    .run(reviewerId, req.requester_id);

  return { success: true, team_id: req.team_id, user_id: req.requester_id };
}

export function rejectJoinRequest(requestId: number, reviewerId: number) {
  const req = db.prepare(
    "SELECT * FROM team_requests WHERE id = ? AND type = 'join' AND status = 'pending'"
  ).get(requestId) as any;
  if (!req) throw new Error('请求不存在或已处理');

  const owner = db.prepare(
    "SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'owner'"
  ).get(req.team_id, reviewerId);
  if (!owner) throw new Error('只有团队负责人可以审批');

  db.prepare('UPDATE team_requests SET status = ?, reviewed_by = ? WHERE id = ?')
    .run('rejected', reviewerId, requestId);
  return { success: true };
}

export function resetAllData() {
  // Must run in correct order due to foreign keys
  const stmts = [
    'DELETE FROM supervisor_requests',
    'DELETE FROM team_requests',
    'DELETE FROM team_members',
    'DELETE FROM comments',
    'UPDATE reports SET team_id = NULL',
    'UPDATE reports SET reviewed_by = NULL',
    'DELETE FROM reports',
    'DELETE FROM teams',
    "DELETE FROM users WHERE role != 'admin'",
  ];
  for (const sql of stmts) {
    db.prepare(sql).run();
  }
}

export function getAllTeamsWithStats() {
  const { start, end } = getWeekRange();
  return db.prepare(`
    SELECT
      t.id, t.name, t.owner_id, t.created_at,
      u.username as owner_name,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as total_members,
      (SELECT COUNT(DISTINCT r.user_id) FROM reports r
       JOIN team_members tm ON r.user_id = tm.user_id AND tm.team_id = t.id
       WHERE r.week_start = ? AND r.week_end = ?) as submitted_count
    FROM teams t
    JOIN users u ON t.owner_id = u.id
    ORDER BY t.created_at DESC
  `).all(start, end);
}

export function getAllTeamOwners() {
  return db.prepare(`
    SELECT DISTINCT u.id, u.username, u.email, u.avatar_url, t.name as team_name
    FROM users u
    JOIN team_members tm ON u.id = tm.user_id AND tm.role = 'owner'
    JOIN teams t ON tm.team_id = t.id
    ORDER BY u.username
  `).all();
}

export function getMembersWithoutReport(teamId: number) {
  const { start, end } = getWeekRange();
  return db.prepare(`
    SELECT u.id, u.username, u.email, u.avatar_url
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
      AND tm.user_id NOT IN (
        SELECT user_id FROM reports
        WHERE week_start = ? AND week_end = ?
      )
    ORDER BY u.username
  `).all(teamId, start, end);
}
