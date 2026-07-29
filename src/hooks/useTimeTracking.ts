import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';
import { qk } from '@/lib/queryClient';
import type { TimeEntry } from '@/types';

export function useRunningTimer() {
  return useQuery({
    queryKey: ['time-entries', 'running'],
    refetchInterval: 15_000,
    queryFn: () =>
      callFunction<{ entry: TimeEntry | null }>('time-entries', {
        query: { running: 1 },
      }).then((r) => r.entry),
  });
}

export function useTimeEntries(taskId: string | undefined) {
  return useQuery({
    queryKey: qk.timeEntries(taskId ?? 'none'),
    enabled: !!taskId,
    queryFn: () =>
      callFunction<{ entries: TimeEntry[] }>('time-entries', {
        query: { taskId: taskId! },
      }).then((r) => r.entries),
  });
}

export function useDaySummary() {
  return useQuery({
    queryKey: ['time-entries', 'summary', 'day'],
    queryFn: () =>
      callFunction<{ totals: Record<string, number> }>('time-entries', {
        query: { summary: 'day' },
      }).then((r) => r.totals),
  });
}

export function useStartTimer(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      callFunction<{ entry: TimeEntry }>('time-entries', {
        method: 'POST',
        query: { action: 'start' },
        body: { task_id: taskId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

export function useStopTimer(taskId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) =>
      callFunction<{ entry: TimeEntry }>('time-entries', {
        method: 'POST',
        query: { action: 'stop' },
        body: id ? { id } : {},
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      if (taskId) qc.invalidateQueries({ queryKey: qk.timeEntries(taskId) });
    },
  });
}
