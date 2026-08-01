import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import {
  useTask,
  useTasks,
  useUpdateTask,
  useDeleteTask,
  useCreateTask,
  useAddDependency,
  useRemoveDependency,
} from '@/hooks/useTasks';
import { useList } from '@/hooks/useProjects';
import { useCustomFields, useTaskFieldValues, useSetFieldValue } from '@/hooks/useCustomFields';
import { Timer } from '@/components/Timer';
import { Attachments } from '@/components/Attachments';
import { CommentThread } from '@/components/CommentThread';
import { CustomFieldInput } from '@/components/CustomFieldInput';
import { LoadingState } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar, StatusBadge } from '@/components/ui/Badges';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceMembers } from '@/hooks/useMembers';
import { PRIORITY_META, type TaskPriority, type Task } from '@/types';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user } = useAuth();
  const { data, isLoading } = useTask(taskId);
  const task = data?.task;
  const { data: list } = useList(task?.list_id);
  const { data: members } = useWorkspaceMembers(list?.workspace_id);
  const update = useUpdateTask(task?.list_id);
  const del = useDeleteTask(task?.list_id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingState />;
  if (!task) return <EmptyState title="Task not found" />;

  const statuses = list?.statuses ?? [];

  function patch(p: Partial<Task>) {
    update.mutate({ id: task!.id, patch: p });
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <button
        className="btn-ghost mb-4 -ml-2"
        onClick={() => (list ? navigate(`/list/${list.id}`) : navigate(-1))}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.is_completed}
              onChange={() => patch({ is_completed: !task.is_completed })}
              className="mt-2 h-5 w-5 rounded border-slate-300 text-brand-600"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== task.title && patch({ title })}
              className={clsx(
                'w-full border-0 bg-transparent text-2xl font-bold text-slate-800 focus:outline-none focus:ring-0',
                task.is_completed && 'line-through opacity-60',
              )}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== (task.description ?? '') && patch({ description })}
              rows={5}
              className="input resize-y"
              placeholder="Add a description…"
            />
          </div>

          <Subtasks parent={task} statuses={statuses} />

          <div className="card p-4">
            <CommentThread taskId={task.id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card space-y-4 p-4">
            <Field label="Status">
              <select
                className="input"
                value={task.status}
                onChange={(e) => {
                  const done = statuses.find((s) => s.name === e.target.value)?.name.toLowerCase() === 'done';
                  patch({ status: e.target.value, is_completed: done });
                }}
              >
                {statuses.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                className="input"
                value={task.priority}
                onChange={(e) => patch({ priority: e.target.value as TaskPriority })}
              >
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="datetime-local"
                className="input"
                value={task.due_date ? toLocal(task.due_date) : ''}
                onChange={(e) => patch({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </Field>
            <Field label="Estimate (min)">
              <input
                type="number"
                className="input"
                defaultValue={task.estimated_minutes ?? ''}
                onBlur={(e) => patch({ estimated_minutes: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label="Assignee">
              <div className="flex items-center gap-2">
                {task.assignee_id && (
                  <Avatar name={task.assignee?.full_name} email={task.assignee?.email} size={24} />
                )}
                <select
                  className="input flex-1"
                  value={task.assignee_id ?? ''}
                  onChange={(e) => patch({ assignee_id: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {members?.members.map((mem) => (
                    <option key={mem.user_id} value={mem.user_id}>
                      {(mem.profile?.full_name || mem.profile?.email || 'User') +
                        (mem.user_id === user?.id ? ' (me)' : '')}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            {task.recurrence && (
              <div className="text-xs text-slate-500">Repeats {task.recurrence.freq}</div>
            )}
          </div>

          <Timer taskId={task.id} />

          <Attachments taskId={task.id} />

          <CustomFields listId={task.list_id} taskId={task.id} />

          <Dependencies task={task} deps={data?.dependencies ?? []} />

          <button
            className="btn-secondary w-full text-red-600"
            onClick={() => {
              if (confirm('Delete this task?')) {
                del.mutate(task.id, {
                  onSuccess: () => {
                    notify('Task deleted', 'success');
                    navigate(list ? `/list/${list.id}` : '/');
                  },
                });
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete task
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function toLocal(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function Subtasks({ parent, statuses }: { parent: Task; statuses: { name: string; color: string }[] }) {
  const create = useCreateTask(parent.list_id);
  const update = useUpdateTask(parent.list_id);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const subtasks = parent.subtasks ?? [];

  function add() {
    if (!title.trim()) return;
    create.mutate({
      title: title.trim(),
      list_id: parent.list_id,
      parent_task_id: parent.id,
      status: statuses[0]?.name ?? 'Open',
    });
    setTitle('');
    setAdding(false);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="label mb-0">
          Subtasks {subtasks.length > 0 && `(${subtasks.filter((s) => s.is_completed).length}/${subtasks.length})`}
        </label>
        <button className="btn-ghost text-xs" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="space-y-1">
        {subtasks.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-md border border-slate-100 px-3 py-2">
            <input
              type="checkbox"
              checked={s.is_completed}
              onChange={() => update.mutate({ id: s.id, patch: { is_completed: !s.is_completed } })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            <button
              className={clsx('flex-1 truncate text-left text-sm text-slate-700', s.is_completed && 'line-through opacity-60')}
              onClick={() => navigate(`/task/${s.id}`)}
            >
              {s.title}
            </button>
            <StatusBadge status={s.status} statuses={statuses} />
          </div>
        ))}
        {adding && (
          <input
            autoFocus
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
              if (e.key === 'Escape') setAdding(false);
            }}
            onBlur={add}
            placeholder="Subtask title…"
          />
        )}
        {subtasks.length === 0 && !adding && <p className="text-sm text-slate-400">No subtasks.</p>}
      </div>
    </div>
  );
}

function CustomFields({ listId, taskId }: { listId: string; taskId: string }) {
  const { data: fields } = useCustomFields(listId);
  const { data: values } = useTaskFieldValues(taskId);
  const setValue = useSetFieldValue(taskId);

  if (!fields || fields.length === 0) return null;

  return (
    <div className="card space-y-3 p-4">
      <span className="label mb-0">Custom fields</span>
      {fields.map((f) => {
        const current = values?.find((v) => v.custom_field_id === f.id)?.value;
        return (
          <div key={f.id}>
            <label className="label">{f.name}</label>
            <CustomFieldInput
              field={f}
              value={current}
              onChange={(value) =>
                setValue.mutate({ custom_field_id: f.id, task_id: taskId, value })
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function Dependencies({
  task,
  deps,
}: {
  task: Task;
  deps: { id: string; depends_on_task_id: string; type: string }[];
}) {
  const { data: siblings } = useTasks(task.list_id);
  const add = useAddDependency(task.id);
  const remove = useRemoveDependency(task.id);
  const [selected, setSelected] = useState('');
  const [type, setType] = useState('waiting_on');

  const candidates = (siblings || []).filter((t) => t.id !== task.id && !t.parent_task_id);
  const byId = new Map(candidates.map((t) => [t.id, t]));

  return (
    <div className="card space-y-3 p-4">
      <span className="label mb-0">Dependencies</span>
      {deps.length === 0 && <p className="text-sm text-slate-400">None.</p>}
      {deps.map((d) => (
        <div key={d.id} className="flex items-center gap-2 text-sm">
          <Ban className={clsx('h-3.5 w-3.5', d.type === 'blocking' ? 'text-red-500' : 'text-amber-500')} />
          <span className="text-xs uppercase text-slate-400">
            {d.type === 'blocking' ? 'Blocks' : 'Waiting on'}
          </span>
          <span className="flex-1 truncate text-slate-700">
            {byId.get(d.depends_on_task_id)?.title ?? 'Task'}
          </span>
          <button className="text-slate-400 hover:text-red-600" onClick={() => remove.mutate(d.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="waiting_on">Waiting on</option>
          <option value="blocking">Blocking</option>
        </select>
        <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select a task…</option>
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <button
          className="btn-secondary"
          disabled={!selected}
          onClick={() => {
            add.mutate({ task_id: task.id, depends_on_task_id: selected, type });
            setSelected('');
          }}
        >
          <Plus className="h-4 w-4" /> Add dependency
        </button>
      </div>
    </div>
  );
}
