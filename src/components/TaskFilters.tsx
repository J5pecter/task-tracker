import { useMemo } from 'react';
import { Popover } from '@headlessui/react';
import { Filter, X } from 'lucide-react';
import type { StatusDef, Task, TaskPriority } from '@/types';
import { PRIORITY_META } from '@/types';
import { isPast, isToday, isThisWeek } from 'date-fns';

export interface Filters {
  status?: string;
  priority?: TaskPriority;
  due?: 'overdue' | 'today' | 'week';
  hideCompleted?: boolean;
}

export function useFilteredTasks(tasks: Task[], f: Filters): Task[] {
  return useMemo(() => {
    return tasks.filter((t) => {
      if (f.hideCompleted && t.is_completed) return false;
      if (f.status && t.status !== f.status) return false;
      if (f.priority && t.priority !== f.priority) return false;
      if (f.due) {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        if (f.due === 'overdue' && !(isPast(d) && !isToday(d))) return false;
        if (f.due === 'today' && !isToday(d)) return false;
        if (f.due === 'week' && !isThisWeek(d)) return false;
      }
      return true;
    });
  }, [tasks, f]);
}

export function TaskFilters({
  value,
  onChange,
  statuses,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  statuses: StatusDef[];
}) {
  const activeCount = Object.values(value).filter(Boolean).length;

  return (
    <Popover className="relative">
      <Popover.Button className="btn-secondary">
        <Filter className="h-4 w-4" />
        Filter
        {activeCount > 0 && (
          <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeCount}</span>
        )}
      </Popover.Button>
      <Popover.Panel className="absolute right-0 z-20 mt-2 w-64 card p-4 space-y-3">
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={value.status ?? ''}
            onChange={(e) => onChange({ ...value, status: e.target.value || undefined })}
          >
            <option value="">Any</option>
            {statuses.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select
            className="input"
            value={value.priority ?? ''}
            onChange={(e) =>
              onChange({ ...value, priority: (e.target.value || undefined) as TaskPriority })
            }
          >
            <option value="">Any</option>
            {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Due</label>
          <select
            className="input"
            value={value.due ?? ''}
            onChange={(e) => onChange({ ...value, due: (e.target.value || undefined) as Filters['due'] })}
          >
            <option value="">Any</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={!!value.hideCompleted}
            onChange={(e) => onChange({ ...value, hideCompleted: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Hide completed
        </label>
        {activeCount > 0 && (
          <button className="btn-ghost w-full text-red-600" onClick={() => onChange({})}>
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </Popover.Panel>
    </Popover>
  );
}
