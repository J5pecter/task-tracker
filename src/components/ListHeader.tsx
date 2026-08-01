import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { List, Task } from '@/types';
import { ViewTabs } from './ViewTabs';
import { TaskForm } from './TaskForm';
import { computeProjectHealth, HEALTH_META, type Health } from '@/lib/projectHealth';

interface ListHeaderProps {
  list: List;
  right?: React.ReactNode;
  /** When provided, renders a project-basis health + completion strip. */
  tasks?: Task[];
}

/** Header shared by List/Board/Calendar views: name, health, view tabs, New task. */
export function ListHeader({ list, right, tasks }: ListHeaderProps) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: list.color }} />
          <h1 className="text-xl font-bold text-slate-800">{list.name}</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>
      {tasks && <ProjectHealthBar tasks={tasks} />}
      <div className="mt-3 flex items-center justify-between">
        <ViewTabs listId={list.id} />
        {right}
      </div>
      <TaskForm
        open={showForm}
        onClose={() => setShowForm(false)}
        listId={list.id}
        statuses={list.statuses}
      />
    </div>
  );
}

/** Project-basis status: auto-derived health legend + % complete. */
function ProjectHealthBar({ tasks }: { tasks: Task[] }) {
  const { percent, done, total, health } = computeProjectHealth(tasks);
  const meta = HEALTH_META[health];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
        {meta.label}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-medium text-slate-600">{percent}% complete</span>
        <span className="text-xs text-slate-400">
          {done}/{total} done
        </span>
      </div>
      <div className="ml-auto hidden items-center gap-3 text-[11px] text-slate-400 sm:flex">
        {(Object.keys(HEALTH_META) as Health[]).map((h) => (
          <span key={h} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: HEALTH_META[h].color }} />
            {HEALTH_META[h].label}
          </span>
        ))}
      </div>
    </div>
  );
}
