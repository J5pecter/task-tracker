import { useState } from 'react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import type { RecurrenceRule, StatusDef, Task, TaskPriority } from '@/types';
import { PRIORITY_META } from '@/types';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  statuses: StatusDef[];
  defaultStatus?: string;
  parentTaskId?: string | null;
  task?: Task; // when present, edit mode
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function TaskForm({
  open,
  onClose,
  listId,
  statuses,
  defaultStatus,
  parentTaskId = null,
  task,
}: TaskFormProps) {
  const isEdit = !!task;
  const create = useCreateTask(listId);
  const update = useUpdateTask(listId);
  const { notify } = useToast();

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState(task?.status ?? defaultStatus ?? statuses[0]?.name ?? 'Open');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [dueDate, setDueDate] = useState(toLocalInput(task?.due_date));
  const [estimate, setEstimate] = useState(
    task?.estimated_minutes != null ? String(task.estimated_minutes) : '',
  );
  const [recurring, setRecurring] = useState<RecurrenceRule['freq'] | ''>(
    task?.recurrence?.freq ?? '',
  );

  async function submit() {
    if (!title.trim()) {
      notify('Title is required', 'error');
      return;
    }
    const payload: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_minutes: estimate ? Number(estimate) : null,
      recurrence: recurring ? { freq: recurring, interval: 1 } : null,
      is_completed: statuses.find((s) => s.name === status)?.name.toLowerCase() === 'done',
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: task!.id, patch: payload });
        notify('Task updated', 'success');
      } else {
        await create.mutateAsync({ ...payload, list_id: listId, parent_task_id: parentTaskId });
        notify('Task created', 'success');
      }
      onClose();
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit task' : parentTaskId ? 'New subtask' : 'New task'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input resize-y"
            placeholder="Add details… (supports plain text / markdown)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
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
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="input"
            >
              {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Estimate (minutes)</label>
            <input
              type="number"
              min={0}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Recurrence</label>
            <select
              value={recurring}
              onChange={(e) => setRecurring(e.target.value as RecurrenceRule['freq'] | '')}
              className="input"
            >
              <option value="">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={create.isPending || update.isPending}>
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
