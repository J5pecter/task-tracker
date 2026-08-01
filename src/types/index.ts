// Shared domain types used across the frontend and (structurally) the functions.

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type DependencyType = 'blocking' | 'waiting_on';
export type CustomFieldType = 'text' | 'number' | 'dropdown' | 'date' | 'checkbox';
export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';

export interface StatusDef {
  name: string;
  color: string;
}

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byweekday?: number[]; // 0=Mon ... 6=Sun
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  ms_user_id: string | null;
  ms_email: string | null;
  ms_token_expires_at: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
}

export interface List {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  name: string;
  color: string;
  position: number;
  statuses: StatusDef[];
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  list_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  estimated_minutes: number | null;
  position: number;
  is_completed: boolean;
  recurrence: RecurrenceRule | null;
  outlook_task_id: string | null;
  outlook_list_id: string | null;
  outlook_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined / derived (optional, populated by some endpoints).
  labels?: Label[];
  subtasks?: Task[];
  assignee?: Pick<UserProfile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
  // Total tracked time across this task's time entries (seconds). Populated by
  // the tasks endpoint.
  logged_seconds?: number;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  type: DependencyType;
}

export interface Comment {
  id: string;
  task_id: string;
  parent_comment_id: string | null;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Pick<UserProfile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
  replies?: Comment[];
}

export interface CustomField {
  id: string;
  list_id: string;
  name: string;
  type: CustomFieldType;
  config: { options?: { label: string; color?: string }[] };
  position: number;
}

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  task_id: string;
  value: unknown;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string | null;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface WorkspaceMember {
  user_id: string;
  role: MemberRole;
  profile: Pick<UserProfile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  normal: { label: 'Normal', color: '#3b82f6' },
  low: { label: 'Low', color: '#94a3b8' },
};
