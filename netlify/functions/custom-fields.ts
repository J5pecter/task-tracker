import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getUserClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

/**
 * Custom field definitions (per list) and their per-task values.
 *
 *   GET    /custom-fields?listId=<id>                    -> field definitions
 *   GET    /custom-fields?taskId=<id>                    -> values for a task
 *   POST   /custom-fields?resource=field                 body: {list_id, name, type, config?, position?}
 *   PATCH  /custom-fields?resource=field&id=<id>         body: partial
 *   DELETE /custom-fields?resource=field&id=<id>
 *   PUT    /custom-fields?resource=value                 body: {custom_field_id, task_id, value}  (upsert)
 */
const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const db = getUserClient(user.accessToken);
  const q = event.queryStringParameters || {};
  const m = method(event);

  try {
    if (m === 'GET') {
      if (q.listId) {
        const { data, error } = await db
          .from('custom_fields')
          .select('*')
          .eq('list_id', q.listId)
          .order('position');
        if (error) throw error;
        return json(200, { fields: data });
      }
      if (q.taskId) {
        const { data, error } = await db
          .from('custom_field_values')
          .select('*')
          .eq('task_id', q.taskId);
        if (error) throw error;
        return json(200, { values: data });
      }
      return json(400, { error: 'listId or taskId required' });
    }

    if (m === 'POST' && q.resource === 'field') {
      const body = parseBody(event);
      const { data, error } = await db.from('custom_fields').insert(body).select().single();
      if (error) throw error;
      return json(201, { field: data });
    }

    if (m === 'PATCH' && q.resource === 'field') {
      if (!q.id) return json(400, { error: 'id required' });
      const body = parseBody(event);
      const { data, error } = await db
        .from('custom_fields')
        .update(body)
        .eq('id', q.id)
        .select()
        .single();
      if (error) throw error;
      return json(200, { field: data });
    }

    if (m === 'DELETE' && q.resource === 'field') {
      if (!q.id) return json(400, { error: 'id required' });
      const { error } = await db.from('custom_fields').delete().eq('id', q.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    // Upsert a value (PUT).
    if ((m as string) === 'PUT' && q.resource === 'value') {
      const body = parseBody<{ custom_field_id: string; task_id: string; value: unknown }>(event);
      const { data, error } = await db
        .from('custom_field_values')
        .upsert(body, { onConflict: 'custom_field_id,task_id' })
        .select()
        .single();
      if (error) throw error;
      return json(200, { value: data });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('custom-fields error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
