import client from './client';

export interface Team {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  created_at: string;
  my_role: string;
}

export interface TeamMember {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url: string | null;
  team_role: string;
  joined_at: string;
}

export interface TeamRequest {
  id: number;
  requester_id: number;
  team_id: number | null;
  type: 'create' | 'join';
  team_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  created_at: string;
  requester_name: string;
}

export async function getMyTeams() {
  const res = await client.get('/teams');
  return res.data as Team[];
}

export async function getTeamDetail(id: number) {
  const res = await client.get(`/teams/${id}`);
  return res.data as { team: Team; members: TeamMember[] };
}

export async function removeMember(teamId: number, userId: number) {
  await client.delete(`/teams/${teamId}/members/${userId}`);
}

export async function leaveTeam(teamId: number) {
  await client.post(`/teams/${teamId}/leave`);
}

export async function deleteTeam(teamId: number) {
  await client.delete(`/teams/${teamId}`);
}

export async function createTeamRequest(teamName: string) {
  const res = await client.post('/teams/requests', { team_name: teamName });
  return res.data;
}

export async function getPendingTeamRequests() {
  const res = await client.get('/teams/requests/pending');
  return res.data as TeamRequest[];
}

export async function approveTeamRequest(id: number) {
  await client.post(`/teams/requests/${id}/approve`);
}

export async function rejectTeamRequest(id: number) {
  await client.post(`/teams/requests/${id}/reject`);
}

export async function getAvailableTeams() {
  const res = await client.get('/teams/available');
  return res.data as (Team & { owner_name: string })[];
}

export async function requestJoinTeam(teamId: number) {
  const res = await client.post(`/teams/${teamId}/join`);
  return res.data;
}

export async function getJoinRequests(teamId: number) {
  const res = await client.get(`/teams/${teamId}/join-requests`);
  return res.data as TeamRequest[];
}

export async function approveJoinRequest(id: number) {
  const res = await client.post(`/teams/join-requests/${id}/approve`);
  return res.data as { success: boolean; team_id: number; user_id: number };
}

export async function rejectJoinRequest(id: number) {
  const res = await client.post(`/teams/join-requests/${id}/reject`);
  return res.data as { success: boolean };
}

export async function getMembersWithoutReport(teamId: number) {
  const res = await client.get(`/teams/${teamId}/members-without-report`);
  return res.data as { id: number; username: string; email: string; avatar_url: string | null }[];
}

export async function getAllTeams() {
  const res = await client.get('/teams/all');
  return res.data as { id: number; name: string; owner_id: number; owner_name: string; total_members: number; submitted_count: number }[];
}

export async function deleteTeamAsAdmin(teamId: number) {
  await client.delete(`/teams/${teamId}`);
}

export async function getAllTeamOwners() {
  const res = await client.get('/teams/owners');
  return res.data as { id: number; username: string; email: string; avatar_url: string | null; team_name: string }[];
}
