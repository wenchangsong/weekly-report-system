import client from './client';
import type { Report, PaginatedResponse, ReportStats } from '../types';

interface ReportFilters {
  user_id?: number;
  team_id?: number;
  week_start?: string;
  week_end?: string;
  status?: string;
  limit?: number;
  offset?: number;
  my_subordinates?: boolean;
}

export async function getReports(filters: ReportFilters = {}) {
  const res = await client.get('/reports', { params: filters });
  return res.data as PaginatedResponse<Report>;
}

export async function getReport(id: number) {
  const res = await client.get(`/reports/${id}`);
  return res.data as Report;
}

export async function createReport(data: {
  week_start: string;
  week_end: string;
  work_done: string;
  plan_next: string;
  issues: string;
  team_id?: number;
  status?: string;
}) {
  const res = await client.post('/reports', data);
  return res.data as { id: number };
}

export async function updateReport(id: number, data: Partial<{
  work_done: string;
  plan_next: string;
  issues: string;
  status: string;
}>) {
  const res = await client.put(`/reports/${id}`, data);
  return res.data as Report;
}

export async function deleteReport(id: number) {
  await client.delete(`/reports/${id}`);
}

export async function retractReport(id: number) {
  const res = await client.post(`/reports/${id}/retract`);
  return res.data as Report;
}

export async function reviewReport(id: number) {
  const res = await client.post(`/reports/${id}/review`);
  return res.data as Report;
}

export async function rejectReport(id: number) {
  const res = await client.post(`/reports/${id}/reject`);
  return res.data as Report;
}

export async function getReportStats() {
  const res = await client.get('/reports/stats');
  return res.data as ReportStats;
}

export async function getWeekRange(date?: string) {
  const res = await client.get('/reports/week-range', { params: { date } });
  return res.data as { start: string; end: string };
}

export async function downloadExport(filters: ReportFilters = {}) {
  const params: any = {};
  if (filters.week_start) params.week_start = filters.week_start;
  if (filters.week_end) params.week_end = filters.week_end;
  if (filters.user_id) params.user_id = String(filters.user_id);
  if (filters.status) params.status = filters.status;

  const res = await client.get('/reports/export', {
    params,
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `weekly-reports-${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
