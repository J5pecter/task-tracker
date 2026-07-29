import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getUserClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

const SELECT = '*, author:user_profiles!comments_author_id_fkey(id, full_name, email, avatar_url)';

// Nest flat comments into threads by parent_comment_id.
function threadify(rows: any[]) {
  const byId = new Map<string, any>();
  rows.forEach((r) => byId.set(r.id, { ...r, replies: [] }));
  const roots: any[] = [];
  byId.forEach((c) => {
    if (c.parent_comment_id && byId.has(c.parent_comment_id)) {
      byId.get(c.parent_comment_id).replies.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

/**
 *   GET    /comments?taskId=<id>
 *   POST   /comments                 body: { task_id, body, parent_comment_id? }
 *   PATCH  /comments?id=<id>          body: { body }
 *   DELETE /comments?id=<id>
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
        .from('comments')
        .select(SELECT)
        .eq('task_id', q.taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return json(200, { comments: threadify(data || []) });
    }

    if (m === 'POST') {
      const body = parseBody<Record<string, unknown>>(event);
      const { data, error } = await db
        .from('comments')
        .insert({ ...body, author_id: user.id })
        .select(SELECT)
        .single();
      if (error) throw error;
      return json(201, { comment: data });
    }

    if (m === 'PATCH') {
      if (!q.id) return json(400, { error: 'id required' });
      const body = parseBody<{ body: string }>(event);
      const { data, error } = await db
        .from('comments')
        .update({ body: body.body })
        .eq('id', q.id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return json(200, { comment: data });
    }

    if (m === 'DELETE') {
      if (!q.id) return json(400, { error: 'id required' });
      const { error } = await db.from('comments').delete().eq('id', q.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('comments error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
