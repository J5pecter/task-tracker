import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';
import { qk } from '@/lib/queryClient';
import type { CustomField, CustomFieldValue } from '@/types';

export function useCustomFields(listId: string | undefined) {
  return useQuery({
    queryKey: qk.customFields(listId ?? 'none'),
    enabled: !!listId,
    queryFn: () =>
      callFunction<{ fields: CustomField[] }>('custom-fields', {
        query: { listId: listId! },
      }).then((r) => r.fields),
  });
}

export function useTaskFieldValues(taskId: string | undefined) {
  return useQuery({
    queryKey: ['custom-field-values', taskId ?? 'none'],
    enabled: !!taskId,
    queryFn: () =>
      callFunction<{ values: CustomFieldValue[] }>('custom-fields', {
        query: { taskId: taskId! },
      }).then((r) => r.values),
  });
}

export function useCreateCustomField(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CustomField>) =>
      callFunction<{ field: CustomField }>('custom-fields', {
        method: 'POST',
        query: { resource: 'field' },
        body: { ...body, list_id: listId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customFields(listId) }),
  });
}

export function useSetFieldValue(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { custom_field_id: string; task_id: string; value: unknown }) =>
      callFunction('custom-fields', { method: 'PUT', query: { resource: 'value' }, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-field-values', taskId] }),
  });
}
