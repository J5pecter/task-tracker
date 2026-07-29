import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';
import { qk } from '@/lib/queryClient';
import type { Comment } from '@/types';

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: qk.comments(taskId ?? 'none'),
    enabled: !!taskId,
    queryFn: () =>
      callFunction<{ comments: Comment[] }>('comments', { query: { taskId: taskId! } }).then(
        (r) => r.comments,
      ),
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { task_id: string; body: string; parent_comment_id?: string }) =>
      callFunction<{ comment: Comment }>('comments', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.comments(taskId) }),
  });
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callFunction('comments', { method: 'DELETE', query: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.comments(taskId) }),
  });
}
