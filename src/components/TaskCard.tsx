import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Clock, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import type { StatusDef, Task } from '@/types';
import { Avatar, LabelChip, PriorityBadge, StatusBadge } from './ui/Badges';
import { formatDueDate, formatDuration, formatMinutes } from '@/lib/format';
import { useUpdateTask } from '@/hooks/useTasks';

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
            <EstimateEditor task={task} />
          </div>
        </div>
        {task.assignee && (
          <Avatar name={task.assignee.full_name} email={task.assignee.email} size={26} />
        )}
      </div>
    </div>
  );
}

/**
 * Parses a friendly estimate string into minutes.
 * Accepts "90", "1h", "1h 30m", "1h30m", "45m". Returns null to clear.
 */
function parseEstimate(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10); // plain number = minutes
  let mins = 0;
  let matched = false;
  const h = s.match(/(\d+)\s*h/);
  if (h) {
    mins += parseInt(h[1], 10) * 60;
    matched = true;
  }
  const m = s.match(/(\d+)\s*m/);
  if (m) {
    mins += parseInt(m[1], 10);
    matched = true;
  }
  return matched ? mins : null;
}

/**
 * Tracked time vs. estimate — with the estimate editable inline. Click it to
 * type a new estimate (e.g. "1h 30m"); Enter or blur saves, Esc cancels.
 */
function EstimateEditor({ task }: { task: Task }) {
  const update = useUpdateTask(task.list_id);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  const estMin = task.estimated_minutes;
  const loggedSec = task.logged_seconds ?? 0;
  const over = estMin != null && estMin > 0 && loggedSec > estMin * 60;

  function start(e: React.MouseEvent) {
    e.stopPropagation();
    setVal(estMin ? formatMinutes(estMin) : '');
    setEditing(true);
  }

  function save() {
    setEditing(false);
    const parsed = parseEstimate(val);
    if (parsed !== (estMin ?? null)) {
      update.mutate({ id: task.id, patch: { estimated_minutes: parsed } });
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
        onBlur={save}
        placeholder="e.g. 1h 30m"
        className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:border-brand-500 focus:outline-none"
      />
    );
  }

  const spent = loggedSec > 0 ? formatDuration(loggedSec) : '';
  const est = estMin ? formatMinutes(estMin) : '';
  const label = spent && est ? `${spent} / ${est}` : spent ? `${spent} / —` : est || 'Estimate';

  return (
    <button
      onClick={start}
      title="Click to edit estimate"
      className={clsx(
        'inline-flex items-center gap-1 rounded px-1 text-xs hover:bg-slate-100',
        over ? 'text-red-600' : est || spent ? 'text-slate-500' : 'text-slate-400',
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
