import { differenceInCalendarDays, isPast, isToday } from 'date-fns';
import type { Task } from '@/types';

// Project-level health legend (generic — On Track / At Risk / Off Track).
export type Health = 'on_track' | 'at_risk' | 'off_track';

export const HEALTH_META: Record<Health, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: '#22c55e' },
  at_risk: { label: 'At Risk', color: '#f59e0b' },
  off_track: { label: 'Off Track', color: '#ef4444' },
};

export interface ProjectHealth {
  percent: number;
  done: number;
  total: number;
  health: Health;
}

/**
 * Derives a project's completion % and health legend from its tasks, on a
 * project basis: any overdue task → Off Track; anything due within 3 days →
 * At Risk; otherwise On Track.
 */
export function computeProjectHealth(tasks: Task[]): ProjectHealth {
  const active = tasks.filter((t) => !t.parent_task_id);
  const total = active.length;
  const done = active.filter((t) => t.is_completed).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const now = new Date();
  const hasOverdue = active.some(
    (t) =>
      !t.is_completed &&
      t.due_date &&
      isPast(new Date(t.due_date)) &&
      !isToday(new Date(t.due_date)),
  );
  const hasDueSoon = active.some((t) => {
    if (t.is_completed || !t.due_date) return false;
    const days = differenceInCalendarDays(new Date(t.due_date), now);
    return days >= 0 && days <= 3;
  });

  let health: Health = 'on_track';
  if (hasOverdue) health = 'off_track';
  else if (hasDueSoon) health = 'at_risk';

  return { percent, done, total, health };
}
