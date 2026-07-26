import { Request } from 'express';

export interface AuthPayload {
  userId: number;
  username: string;
  role: 'admin' | 'manager' | 'member';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'member';
  supervisor_id: number | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ReportRow {
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
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
}

export interface SupervisorRequestRow {
  id: number;
  user_id: number;
  supervisor_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  username?: string;
  supervisor_name?: string;
}

export interface CommentRow {
  id: number;
  report_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export interface ReminderRow {
  id: number;
  cron_expression: string;
  enabled: number;
  title: string;
  message_template: string;
  last_triggered_at: string | null;
}
