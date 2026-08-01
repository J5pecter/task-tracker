import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useList } from '@/hooks/useProjects';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { ListHeader } from '@/components/ListHeader';
import { LoadingState } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar, PriorityBadge, StatusBadge } from '@/components/ui/Badges';
import { formatDueDate } from '@/lib/format';
import { TaskFilters, useFilteredTasks, type Filters } from '@/components/TaskFilters';
import type { Task } from '@/types';
import clsx from 'clsx';

export default function ListView() {
  const { listId } = useParams<{ listId: string }>();
  const { data: list, isLoading: listLoading } = useList(listId);
  const { data: tasks, isLoading } = useTasks(listId);
  const update = useUpdateTask(listId);
  const [filters, setFilters] = useState<Filters>({});
  const [order, setOrder] = useState<string[]>([]);

  const topLevel = useMemo(
    () => (tasks || []).filter((t) => !t.parent_task_id),
    [tasks],
  );
  const filtered = useFilteredTasks(topLevel, filters);

  // Maintain a client-side order overlay for drag-sorting.
  const ordered = useMemo(() => {
    if (order.length === 0) return filtered;
    const map = new Map(filtered.map((t) => [t.id, t]));
    const inOrder = order.map((id) => map.get(id)).filter(Boolean) as Task[];
    const rest = filtered.filter((t) => !order.includes(t.id));
    return [...inOrder, ...rest];
  }, [filtered, order]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((t) => t.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = arrayMove(ids, from, to);
    setOrder(next);
    // Persist positions.
    next.forEach((id, i) => update.mutate({ id, patch: { position: i } }));
  }

  if (listLoading || isLoading) return <LoadingState />;
  if (!list) return <EmptyState title="List not found" />;

  return (
    <div>
      <ListHeader
        list={list}
        right={<TaskFilters value={filters} onChange={setFilters} statuses={list.statuses} />}
      />
      <div className="p-6">
        {ordered.length === 0 ? (
          <EmptyState title="No tasks match" description="Create a task or adjust your filters." />
        ) : (
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[24px_1fr_140px_120px_90px_110px_40px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span />
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Est.</span>
              <span>Due</span>
              <span />
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ordered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {ordered.map((task) => (
                  <Row
                    key={task.id}
                    task={task}
                    statuses={list.statuses}
                    onToggle={() =>
                      update.mutate({ id: task.id, patch: { is_completed: !task.is_completed } })
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  task,
  statuses,
  onToggle,
}: {
  task: Task;
  statuses: { name: string; color: string }[];
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const navigate = useNavigate();
  const due = formatDueDate(task.due_date);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'grid grid-cols-[24px_1fr_140px_120px_90px_110px_40px] items-center gap-3 border-b border-slate-100 px-4 py-2.5 hover:bg-slate-50',
        isDragging && 'bg-brand-50 shadow',
      )}
    >
      <button
        className="cursor-grab text-slate-300 hover:text-slate-500"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={onToggle}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
        />
        <button
          className={clsx('truncate text-left text-sm font-medium text-slate-800', task.is_completed && 'line-through opacity-60')}
          onClick={() => navigate(`/task/${task.id}`)}
        >
          {task.title}
        </button>
        {task.assignee && (
          <Avatar name={task.assignee.full_name} email={task.assignee.email} size={20} />
        )}
      </div>
      <StatusBadge status={task.status} statuses={statuses} />
      <div>{task.priority !== 'normal' ? <PriorityBadge priority={task.priority} /> : <span className="text-xs text-slate-400">—</span>}</div>
      <div className="text-xs text-slate-500">{estimateLabel(task.estimated_minutes)}</div>
      <div className={clsx('text-xs', due?.overdue ? 'text-red-600' : 'text-slate-500')}>
        {due?.label ?? '—'}
      </div>
      <span />
    </div>
  );
}

function estimateLabel(min: number | null): string {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
