import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useList } from '@/hooks/useProjects';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { ListHeader } from '@/components/ListHeader';
import { KanbanColumn } from '@/components/KanbanColumn';
import { LoadingState } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Task } from '@/types';

export default function BoardView() {
  const { listId } = useParams<{ listId: string }>();
  const { data: list, isLoading: ll } = useList(listId);
  const { data: tasks, isLoading } = useTasks(listId);
  const update = useUpdateTask(listId);

  const byStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    (list?.statuses ?? []).forEach((s) => (map[s.name] = []));
    (tasks || [])
      .filter((t) => !t.parent_task_id)
      .forEach((t) => {
        (map[t.status] ??= []).push(t);
      });
    return map;
  }, [tasks, list]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) return;

    // Dropped on a column header or a card determine the target status.
    let targetStatus: string | undefined;
    const overId = String(over.id);
    if (overId.startsWith('col:')) {
      targetStatus = overId.slice(4);
    } else {
      targetStatus = tasks?.find((t) => t.id === overId)?.status;
    }
    if (!targetStatus || targetStatus === task.status) return;

    const isDone = list?.statuses.find((s) => s.name === targetStatus)?.name.toLowerCase() === 'done';
    update.mutate({ id: taskId, patch: { status: targetStatus, is_completed: isDone } });
  }

  if (ll || isLoading) return <LoadingState />;
  if (!list) return <EmptyState title="List not found" />;

  return (
    <div className="flex h-full flex-col">
      <ListHeader list={list} tasks={tasks || []} />
      <div className="scrollbar-thin flex-1 overflow-x-auto p-6">
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex h-full gap-4">
            {list.statuses.map((s) => (
              <KanbanColumn key={s.name} status={s} tasks={byStatus[s.name] || []} statuses={list.statuses} />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
