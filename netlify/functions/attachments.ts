import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getUserClient, getAdminClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

const BUCKET = 'attachments';

/**
 * Attachment metadata for tasks. The binary file itself is uploaded to (and
 * downloaded from) Supabase Storage directly by the browser using the user's
 * session; this function records/removes the metadata row and cleans up the
 * stored object on delete (via the service-role client).
 *
 *   GET    /attachments?taskId=<id>            -> metadata rows for a task
 *   POST   /attachments                        body: {task_id, file_name, storage_path, mime_type?, size_bytes?}
 *   DELETE /attachments?id=<id>                -> remove row + storage object
 */
const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const db = getUserClient(user.accessToken);
  const q = event.queryStringParameters || {};
  const m = method(event);

  try {
    if (m === 'GET') {
      if (!q.taskId) return json(400, { error: 'taskId required' });
      const { data, error } = await db
        .from('attachments')
        .select('*')
        .eq('task_id', q.taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(200, { attachments: data });
    }

    if (m === 'POST') {
      const body = parseBody<Record<string, unknown>>(event);
      const { data, error } = await db
        .from('attachments')
        .insert({ ...body, uploaded_by: user.id })
        .select('*')
        .single();
      if (error) throw error;
      return json(201, { attachment: data });
    }

    if (m === 'DELETE') {
      if (!q.id) return json(400, { error: 'id required' });
      // Fetch the row (RLS-checked) to learn the storage path.
      const { data: row, error: fetchErr } = await db
        .from('attachments')
        .select('storage_path')
        .eq('id', q.id)
        .single();
      if (fetchErr) throw fetchErr;

      // Remove the stored object with the service-role client, then the row.
      if (row?.storage_path) {
        await getAdminClient().storage.from(BUCKET).remove([row.storage_path]);
      }
      const { error } = await db.from('attachments').delete().eq('id', q.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('attachments error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
