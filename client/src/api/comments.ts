import client from './client';
import type { Comment } from '../types';

export async function getComments(reportId: number) {
  const res = await client.get(`/reports/${reportId}/comments`);
  return res.data as Comment[];
}

export async function createComment(reportId: number, content: string) {
  const res = await client.post(`/reports/${reportId}/comments`, { content });
  return res.data as Comment;
}

export async function deleteComment(commentId: number) {
  await client.delete(`/comments/${commentId}`);
}
