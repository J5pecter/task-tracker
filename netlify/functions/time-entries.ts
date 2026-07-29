import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getUserClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

/**
 * Time tracking. A "running" timer is an entry with ended_at = null.
 *
 *   GET    /time-entries?taskId=<id>            -> entries for a task
 *   GET    /time-entries?running=1              -> the caller's active timer (if any)
 *   GET    /time-entries?summary=day            -> today's total per task for the caller
 *   POST   /time-entries?action=start           body: { task_id }
 *   POST   /time-entries?action=stop            body: { id }  (or omit to stop running one)
 *   POST   /time-entries                        body: manual entry {task_id, started_at, ended_at, note}
 *   DELETE /time-entries?id=<id>
 */
const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const db = getUserClient(user.accessToken);
  const q = event.queryStringParameters || {};
  const m = method(event);

  try {
    if (m === 'GET') {
      if (q.running === '1') {
        const { data, error } = await db
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return json(200, { entry: data });
      }
      if (q.summary === 'day') {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        const { data, error } = await db
          .from('time_entries')
          .select('task_id, duration_seconds')
          .eq('user_id', user.id)
          .gte('started_at', since.toISOString())
          .not('duration_seconds', 'is', null);
        if (error) throw error;
        const totals: Record<string, number> = {};
        (data || []).forEach((e: any) => {
          totals[e.task_id] = (totals[e.task_id] || 0) + (e.duration_seconds || 0);
        });
        return json(200, { totals });
      }
      if (!q.taskId) return json(400, { error: 'taskId required' });
      const { data, error } = await db
        .from('time_entries')
        .select('*')
        .eq('task_id', q.taskId)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return json(200, { entries: data });
    }

    if (m === 'POST') {
      if (q.action === 'start') {
        const { task_id } = parseBody<{ task_id: string }>(event);
        if (!task_id) return json(400, { error: 'task_id required' });
        // Stop any existing running timer for this user first.
        const now = new Date().toISOString();
        const { data: running } = await db
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .is('ended_at', null);
        for (const r of running || []) {
          const dur = Math.round((Date.parse(now) - Date.parse(r.started_at)) / 1000);
          await db
            .from('time_entries')
            .update({ ended_at: now, duration_seconds: dur })
            .eq('id', r.id);
        }
        const { data, error } = await db
          .from('time_entries')
          .insert({ task_id, user_id: user.id, started_at: now })
          .select()
          .single();
        if (error) throw error;
        return json(201, { entry: data });
      }

      if (q.action === 'stop') {
        const { id } = parseBody<{ id?: string }>(event);
        const now = new Date().toISOString();
        let query = db.from('time_entries').select('*').eq('user_id', user.id).is('ended_at', null);
        if (id) query = db.from('time_entries').select('*').eq('id', id);
        const { data: entries, error: findErr } = await query;
        if (findErr) throw findErr;
        const entry = entries?.[0];
        if (!entry) return json(404, { error: 'No running timer' });
        const dur = Math.round((Date.parse(now) - Date.parse(entry.started_at)) / 1000);
        const { data, error } = await db
          .from('time_entries')
          .update({ ended_at: now, duration_seconds: dur })
          .eq('id', entry.id)
          .select()
          .single();
        if (error) throw error;
        return json(200, { entry: data });
      }

      // Manual entry.
      const body = parseBody<Record<string, any>>(event);
      const dur =
        body.started_at && body.ended_at
          ? Math.round((Date.parse(body.ended_at) - Date.parse(body.started_at)) / 1000)
          : null;
      const { data, error } = await db
        .from('time_entries')
        .insert({ ...body, user_id: user.id, duration_seconds: dur })
        .select()
        .single();
      if (error) throw error;
      return json(201, { entry: data });
    }

    if (m === 'DELETE') {
      if (!q.id) return json(400, { error: 'id required' });
      const { error } = await db.from('time_entries').delete().eq('id', q.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('time-entries error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
