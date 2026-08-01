import { useNavigate } from 'react-router-dom';
import { CalendarClock, Clock, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import type { StatusDef, Task } from '@/types';
import { Avatar, LabelChip, PriorityBadge, StatusBadge } from './ui/Badges';
import { formatDueDate, formatDuration, formatMinutes } from '@/lib/format';

interface TaskCardProps {
  task: Task;
  statuses?: StatusDef[];
  showStatus?: boolean;
  onToggleComplete?: (task: Task) => void;
  compact?: boolean;
}

export function TaskCard({ task, statuses, showStatus = true, onToggleComplete, compact }: TaskCardProps) {
  const navigate = useNavigate();
  const due = formatDueDate(task.due_date);

  return (
    <div
      className={clsx(
        'card cursor-pointer p-3 transition-shadow hover:shadow-md',
        task.is_completed && 'opacity-60',
      )}
      onClick={() => navigate(`/task/${task.id}`)}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={(e) => {
            e.stopPropagation();
            onToggleComplete?.(task);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <div className="min-w-0 flex-1">
          <div className={clsx('font-medium text-slate-800', task.is_completed && 'line-through')}>
            {task.title}
          </div>
          {!compact && task.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
              {task.description.replace(/<[^>]+>/g, '')}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {task.priority !== 'normal' && <PriorityBadge priority={task.priority} />}
            {showStatus && <StatusBadge status={task.status} statuses={statuses} />}
            {task.labels?.map((l) => (
              <LabelChip key={l.id} name={l.name} color={l.color} />
            ))}
            {due && (
              <span
                className={clsx(
                  'inline-flex items-center gap-1 text-xs',
                  due.overdue ? 'text-red-600' : 'text-slate-500',
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {due.label}
              </span>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <GitBranch className="h-3.5 w-3.5" />
                {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
              </span>
            )}
            {(task.estimated_minutes || (task.logged_seconds ?? 0) > 0) && (
              <TimeChip estMin={task.estimated_minutes} loggedSec={task.logged_seconds ?? 0} />
            )}
          </div>
        </div>
        {task.assignee && (
          <Avatar name={task.assignee.full_name} email={task.assignee.email} size={26} />
        )}
      </div>
    </div>
  );
}

/** Tracked time vs. estimate. Turns red when actual exceeds the estimate. */
function TimeChip({ estMin, loggedSec }: { estMin: number | null; loggedSec: number }) {
  const over = estMin != null && estMin > 0 && loggedSec > estMin * 60;
  const actual = loggedSec > 0 ? formatDuration(loggedSec) : '0m';
  return (
    <span
      className={clsx('inline-flex items-center gap-1 text-xs', over ? 'text-red-600' : 'text-slate-500')}
      title="Time spent / estimated"
    >
      <Clock className="h-3.5 w-3.5" />
      {actual}
      {estMin ? ` / ${formatMinutes(estMin)}` : ''}
    </span>
  );
}
