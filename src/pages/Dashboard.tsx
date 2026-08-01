import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Flame, Inbox, Plus } from 'lucide-react';
import { useMyTasks, useUpdateTask } from '@/hooks/useTasks';
import { useWorkspaces, useCreateList } from '@/hooks/useProjects';
import { TaskCard } from '@/components/TaskCard';
import { LoadingState } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { Task } from '@/types';
import { isPast, isToday } from 'date-fns';

export default function Dashboard() {
  const { data: tasks, isLoading } = useMyTasks();
  const update = useUpdateTask();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data: workspaces } = useWorkspaces();
  const wsId = workspaces?.[0]?.id ?? '';
  const createList = useCreateList(wsId);

  async function createFirstList() {
    if (!wsId) {
      notify('Create a workspace first (sidebar).', 'error');
      return;
    }
    try {
      const res = await createList.mutateAsync({ name: 'Tasks', workspace_id: wsId });
      navigate(`/list/${res.list.id}`);
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  const groups = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const noDate: Task[] = [];
    (tasks || [])
      .filter((t) => !t.is_completed)
      .forEach((t) => {
        if (!t.due_date) return noDate.push(t);
        const d = new Date(t.due_date);
        if (isToday(d)) today.push(t);
        else if (isPast(d)) overdue.push(t);
        else upcoming.push(t);
      });
    return { overdue, today, upcoming, noDate };
  }, [tasks]);

  const completedCount = (tasks || []).filter((t) => t.is_completed).length;

  function toggle(task: Task) {
    update.mutate({ id: task.id, patch: { is_completed: !task.is_completed } });
  }

  if (isLoading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-slate-800">My Tasks</h1>
          <p className="text-sm text-slate-500">Everything assigned to you, across all workspaces.</p>
        </div>
        <button className="btn-secondary shrink-0" onClick={createFirstList} disabled={createList.isPending}>
          <Plus className="h-4 w-4" /> New list
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Flame} label="Overdue" value={groups.overdue.length} tone="red" />
        <StatCard icon={Clock} label="Due today" value={groups.today.length} tone="amber" />
        <StatCard icon={Inbox} label="Upcoming" value={groups.upcoming.length} tone="brand" />
        <StatCard icon={CheckCircle2} label="Completed" value={completedCount} tone="green" />
      </div>

      {!tasks || tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Create a list, then add tasks to it — set a status, estimate the time, and track it."
          action={
            <button className="btn-primary" onClick={createFirstList} disabled={createList.isPending}>
              <Plus className="h-4 w-4" /> Create a list
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          <Section title="Overdue" tasks={groups.overdue} onToggle={toggle} />
          <Section title="Due today" tasks={groups.today} onToggle={toggle} />
          <Section title="Upcoming" tasks={groups.upcoming} onToggle={toggle} />
          <Section title="No due date" tasks={groups.noDate} onToggle={toggle} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tasks,
  onToggle,
}: {
  title: string;
  tasks: Task[];
  onToggle: (t: Task) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} <span className="text-slate-400">({tasks.length})</span>
      </h2>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onToggleComplete={onToggle} showStatus />
        ))}
      </div>
    </div>
  );
}

const tones: Record<string, string> = {
  red: 'text-red-600 bg-red-50',
  amber: 'text-amber-600 bg-amber-50',
  brand: 'text-brand-600 bg-brand-50',
  green: 'text-green-600 bg-green-50',
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`rounded-lg p-2 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
