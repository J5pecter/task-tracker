import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getUserClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

const TASK_SELECT =
  '*, labels:task_labels(label:labels(*)), assignee:user_profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url)';

// Flatten the nested label join into a simple labels[] array.
function shapeTask(row: any) {
  if (!row) return row;
  return {
    ...row,
    labels: Array.isArray(row.labels) ? row.labels.map((l: any) => l.label).filter(Boolean) : [],
  };
}

/**
 * CRUD for tasks + subtasks, plus search and dependencies.
 *
 *   GET    /tasks?listId=<id>                 -> tasks in a list (top-level + subtasks)
 *   GET    /tasks?id=<id>                      -> single task (with subtasks)
 *   GET    /tasks?mine=1                       -> tasks assigned to the current user
 *   GET    /tasks?search=<q>                   -> full-text search across accessible tasks
 *   POST   /tasks                              -> create task (body)
 *   PATCH  /tasks?id=<id>                       -> update task
 *   DELETE /tasks?id=<id>                       -> delete task
 *   POST   /tasks?action=dependency            -> add dependency {task_id, depends_on_task_id, type}
 *   DELETE /tasks?action=dependency&id=<id>    -> remove dependency
 */
const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const db = getUserClient(user.accessToken);
  const q = event.queryStringParameters || {};
  const m = method(event);

  try {
    if (m === 'GET') {
      if (q.id) {
        const { data, error } = await db.from('tasks').select(TASK_SELECT).eq('id', q.id).single();
        if (error) throw error;
        const { data: subs } = await db
          .from('tasks')
          .select(TASK_SELECT)
          .eq('parent_task_id', q.id)
          .order('position');
        const { data: deps } = await db
          .from('task_dependencies')
          .select('*')
          .eq('task_id', q.id);
        return json(200, {
          task: { ...shapeTask(data), subtasks: (subs || []).map(shapeTask) },
          dependencies: deps || [],
        });
      }

      if (q.mine === '1') {
        const { data, error } = await db
          .from('tasks')
          .select(TASK_SELECT)
          .eq('assignee_id', user.id)
          .is('parent_task_id', null)
          .order('due_date', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return json(200, { tasks: (data || []).map(shapeTask) });
      }

      if (q.search) {
        const { data, error } = await db
          .from('tasks')
          .select(TASK_SELECT)
          .textSearch('search_tsv', q.search, { type: 'websearch', config: 'english' })
          .limit(50);
        if (error) throw error;
        return json(200, { tasks: (data || []).map(shapeTask) });
      }

      if (q.listId) {
        const { data, error } = await db
          .from('tasks')
          .select(TASK_SELECT)
          .eq('list_id', q.listId)
          .order('position', { ascending: true });
        if (error) throw error;
        return json(200, { tasks: (data || []).map(shapeTask) });
      }

      return json(400, { error: 'Provide id, listId, mine, or search.' });
    }

    if (m === 'POST') {
      // Add a dependency.
      if (q.action === 'dependency') {
        const body = parseBody(event);
        const { data, error } = await db
          .from('task_dependencies')
          .insert(body)
          .select()
          .single();
        if (error) throw error;
        return json(201, { dependency: data });
      }

      // Create a normal task/subtask.
      const body = parseBody<Record<string, unknown>>(event);
      const { data, error } = await db
        .from('tasks')
        .insert({ ...body, created_by: user.id })
        .select(TASK_SELECT)
        .single();
      if (error) throw error;
      return json(201, { task: shapeTask(data) });
    }

    if (m === 'PATCH') {
      if (!q.id) return json(400, { error: 'id required' });
      const body = parseBody<Record<string, unknown>>(event);
      // Keep is_completed in sync when status changes to a "done" state name.
      const { data, error } = await db
        .from('tasks')
        .update(body)
        .eq('id', q.id)
        .select(TASK_SELECT)
        .single();
      if (error) throw error;
      return json(200, { task: shapeTask(data) });
    }

    if (m === 'DELETE') {
      if (q.action === 'dependency') {
        if (!q.id) return json(400, { error: 'id required' });
        const { error } = await db.from('task_dependencies').delete().eq('id', q.id);
        if (error) throw error;
        return json(200, { ok: true });
      }
      if (!q.id) return json(400, { error: 'id required' });
      const { error } = await db.from('tasks').delete().eq('id', q.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('tasks error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
