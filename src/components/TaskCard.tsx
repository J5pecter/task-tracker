import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import {
  CalendarClock,
  Clock,
  ExternalLink,
  Flag,
  GitBranch,
  MoreVertical,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import clsx from 'clsx';
import { PRIORITY_META, type StatusDef, type Task, type TaskPriority } from '@/types';
import { Avatar, LabelChip } from './ui/Badges';
import { formatDueDate, formatDuration, formatMinutes } from '@/lib/format';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/Toast';

interface TaskCardProps {
  task: Task;
  statuses?: StatusDef[];
  showStatus?: boolean;
  onToggleComplete?: (task: Task) => void;
  compact?: boolean;
}

export function TaskCard({ task, statuses, showStatus = true, onToggleComplete, compact }: TaskCardProps) {
  const navigate = useNavigate();

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
            <PriorityEditor task={task} />
            {showStatus && <StatusEditor task={task} statuses={statuses} />}
            {task.labels?.map((l) => (
              <LabelChip key={l.id} name={l.name} color={l.color} />
            ))}
            <DueDateEditor task={task} />
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <GitBranch className="h-3.5 w-3.5" />
                {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
              </span>
            )}
            <EstimateEditor task={task} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {task.assignee && (
            <Avatar name={task.assignee.full_name} email={task.assignee.email} size={26} />
          )}
          <CardMenu task={task} />
        </div>
      </div>
    </div>
  );
}

/** Overflow menu on each card: open, assign to me / unassign, delete. */
function CardMenu({ task }: { task: Task }) {
  const { user } = useAuth();
  const update = useUpdateTask(task.list_id);
  const del = useDeleteTask(task.list_id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const mine = !!user && task.assignee_id === user.id;

  const itemClass = 'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-700 data-[focus]:bg-slate-100';

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        onClick={(e) => e.stopPropagation()}
        title="More actions"
        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-white"
      >
        <MoreVertical className="h-[18px] w-[18px]" />
      </Menu.Button>
      <Menu.Items
        anchor="bottom end"
        className="z-30 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg [--anchor-gap:4px] focus:outline-none"
      >
        <Menu.Item>
          <button
            className={itemClass}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/task/${task.id}`);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
        </Menu.Item>
        <Menu.Item>
          <button
            className={itemClass}
            onClick={(e) => {
              e.stopPropagation();
              update.mutate({ id: task.id, patch: { assignee_id: mine ? null : user?.id ?? null } });
            }}
          >
            {mine ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {mine ? 'Unassign me' : 'Assign to me'}
          </button>
        </Menu.Item>
        <Menu.Item>
          <button
            className={clsx(itemClass, 'text-red-600')}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${task.title}"?`))
                del.mutate(task.id, {
                  onSuccess: () => notify('Task deleted', 'success'),
                  onError: (err) => notify(`Couldn't delete: ${(err as Error).message}`, 'error'),
                });
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </Menu.Item>
      </Menu.Items>
    </Menu>
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

/** Inline priority picker — click the flag to choose a priority. */
function PriorityEditor({ task }: { task: Task }) {
  const update = useUpdateTask(task.list_id);
  const meta = PRIORITY_META[task.priority];
  const isDefault = task.priority === 'normal';

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        onClick={(e) => e.stopPropagation()}
        title="Change priority"
        className="inline-flex items-center gap-1 rounded px-1 text-xs hover:bg-slate-100"
        style={{ color: isDefault ? '#94a3b8' : meta.color }}
      >
        <Flag className="h-3.5 w-3.5" fill="currentColor" />
        {isDefault ? 'Priority' : meta.label}
      </Menu.Button>
      <Menu.Items
        anchor="bottom start"
        className="z-30 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg [--anchor-gap:4px] focus:outline-none"
      >
        {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
          <Menu.Item key={p}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (p !== task.priority) update.mutate({ id: task.id, patch: { priority: p } });
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-slate-700 data-[focus]:bg-slate-100"
            >
              <Flag className="h-3 w-3" fill="currentColor" style={{ color: PRIORITY_META[p].color }} />
              {PRIORITY_META[p].label}
            </button>
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}

function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Inline due-date picker — click to set/clear a due date. */
function DueDateEditor({ task }: { task: Task }) {
  const update = useUpdateTask(task.list_id);
  const [editing, setEditing] = useState(false);
  const due = formatDueDate(task.due_date);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={task.due_date ? isoToDateInput(task.due_date) : ''}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') setEditing(false);
        }}
        onChange={(e) => {
          const v = e.target.value;
          setEditing(false);
          update.mutate({
            id: task.id,
            patch: { due_date: v ? new Date(`${v}T00:00:00`).toISOString() : null },
          });
        }}
        onBlur={() => setEditing(false)}
        className="rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:border-brand-500 focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Click to set due date"
      className={clsx(
        'inline-flex items-center gap-1 rounded px-1 text-xs hover:bg-slate-100',
        due?.overdue ? 'text-red-600' : due ? 'text-slate-500' : 'text-slate-400',
      )}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      {due?.label ?? 'Due'}
    </button>
  );
}

// Fallback statuses for cards shown outside a single list (e.g. My Tasks, Search).
const DEFAULT_STATUSES: StatusDef[] = [
  { name: 'Open', color: '#94a3b8' },
  { name: 'In Progress', color: '#3b82f6' },
  { name: 'Done', color: '#22c55e' },
];

/** Inline status switcher — click the status pill to move the task along. */
function StatusEditor({ task, statuses }: { task: Task; statuses?: StatusDef[] }) {
  const update = useUpdateTask(task.list_id);
  const options = statuses && statuses.length ? statuses : DEFAULT_STATUSES;
  // Ensure the current status is always selectable, even if it's custom.
  const all = options.some((s) => s.name === task.status)
    ? options
    : [{ name: task.status, color: '#94a3b8' }, ...options];
  const current = all.find((s) => s.name === task.status) ?? { name: task.status, color: '#94a3b8' };

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        onClick={(e) => e.stopPropagation()}
        title="Change status"
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium hover:opacity-80"
        style={{ backgroundColor: `${current.color}1a`, color: current.color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: current.color }} />
        {current.name}
      </Menu.Button>
      <Menu.Items
        anchor="bottom start"
        className="z-30 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg [--anchor-gap:4px] focus:outline-none"
      >
        {all.map((s) => (
          <Menu.Item key={s.name}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (s.name !== task.status) {
                  update.mutate({
                    id: task.id,
                    patch: { status: s.name, is_completed: s.name.toLowerCase() === 'done' },
                  });
                }
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-slate-700 data-[focus]:bg-slate-100"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </button>
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}
