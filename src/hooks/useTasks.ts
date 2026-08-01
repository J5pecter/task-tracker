import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';
import { qk } from '@/lib/queryClient';
import type { Task, TaskDependency } from '@/types';

export function useTasks(listId: string | undefined) {
  return useQuery({
    queryKey: qk.tasks(listId ?? 'none'),
    enabled: !!listId,
    queryFn: () =>
      callFunction<{ tasks: Task[] }>('tasks', { query: { listId: listId! } }).then(
        (r) => r.tasks,
      ),
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: qk.task(taskId ?? 'none'),
    enabled: !!taskId,
    queryFn: () =>
      callFunction<{ task: Task; dependencies: TaskDependency[] }>('tasks', {
        query: { id: taskId! },
      }),
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: qk.myTasks,
    queryFn: () =>
      callFunction<{ tasks: Task[] }>('tasks', { query: { mine: 1 } }).then((r) => r.tasks),
  });
}

export function useSearchTasks(term: string) {
  return useQuery({
    queryKey: qk.search(term),
    enabled: term.trim().length >= 2,
    queryFn: () =>
      callFunction<{ tasks: Task[] }>('tasks', { query: { search: term } }).then((r) => r.tasks),
  });
}

function invalidateTaskViews(qc: ReturnType<typeof useQueryClient>, listId?: string) {
  if (listId) qc.invalidateQueries({ queryKey: qk.tasks(listId) });
  qc.invalidateQueries({ queryKey: qk.myTasks });
}

export function useCreateTask(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Task>) =>
      callFunction<{ task: Task }>('tasks', { method: 'POST', body }),
    onSuccess: () => invalidateTaskViews(qc, listId),
  });
}

export function useUpdateTask(listId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      callFunction<{ task: Task }>('tasks', { method: 'PATCH', query: { id }, body: patch }),
    onSuccess: (_d, v) => {
      invalidateTaskViews(qc, listId);
      qc.invalidateQueries({ queryKey: qk.task(v.id) });
    },
  });
}

export function useDeleteTask(listId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callFunction('tasks', { method: 'DELETE', query: { id } }),
    onSuccess: () => invalidateTaskViews(qc, listId),
  });
}

export function useAddDependency(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { task_id: string; depends_on_task_id: string; type: string }) =>
      callFunction('tasks', { method: 'POST', query: { action: 'dependency' }, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.task(taskId) }),
  });
}

export function useRemoveDependency(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      callFunction('tasks', { method: 'DELETE', query: { action: 'dependency', id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.task(taskId) }),
  });
}
