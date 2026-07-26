export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  supervisor_id: number | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Report {
  id: number;
  user_id: number;
  week_start: string;
  week_end: string;
  work_done: string;
  plan_next: string;
  issues: string;
  status: 'draft' | 'submitted';
  reviewed: number;
  reviewed_at: string | null;
  reviewed_by: number | null;
  team_id: number | null;
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
}

export interface SupervisorRequest {
  id: number;
  user_id: number;
  supervisor_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  username?: string;
  supervisor_name?: string;
}

export interface Comment {
  id: number;
  report_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export interface Reminder {
  id: number;
  cron_expression: string;
  enabled: number;
  title: string;
  message_template: string;
  last_triggered_at: string | null;
}

export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ReportStats {
  myTotal: number;
  thisWeekSubmitted: boolean;
  thisWeekReportId: number | null;
  pendingReview: number;
}
