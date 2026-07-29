import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import type { Attachment } from '@/types';

const BUCKET = 'attachments';

export function useAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', taskId ?? 'none'],
    enabled: !!taskId,
    queryFn: () =>
      callFunction<{ attachments: Attachment[] }>('attachments', {
        query: { taskId: taskId! },
      }).then((r) => r.attachments),
  });
}

/** Uploads the file to Supabase Storage, then records its metadata. */
export function useUploadAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const uid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const storagePath = `${taskId}/${uid}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      return callFunction<{ attachment: Attachment }>('attachments', {
        method: 'POST',
        body: {
          task_id: taskId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || null,
          size_bytes: file.size,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', taskId] }),
  });
}

export function useDeleteAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callFunction('attachments', { method: 'DELETE', query: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', taskId] }),
  });
}

/** Creates a short-lived signed URL to view/download a private attachment. */
export async function getAttachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10); // 10 minutes
  if (error) throw error;
  return data.signedUrl;
}
