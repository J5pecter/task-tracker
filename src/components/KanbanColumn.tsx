import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import type { StatusDef, Task } from '@/types';
import { TaskCard } from './TaskCard';

export function KanbanColumn({
  status,
  tasks,
  statuses,
}: {
  status: StatusDef;
  tasks: Task[];
  statuses: StatusDef[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status.name}` });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
        <span className="text-sm font-semibold text-slate-700">{status.name}</span>
        <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-500">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          'scrollbar-thin flex-1 space-y-2 overflow-y-auto rounded-lg p-2 transition-colors',
          isOver ? 'bg-brand-50' : 'bg-slate-100/60',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <DraggableCard key={t.id} task={t} statuses={statuses} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ task, statuses }: { task: Task; statuses: StatusDef[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50' : ''}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} statuses={statuses} showStatus={false} compact />
    </div>
  );
}
