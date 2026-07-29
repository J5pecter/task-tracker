import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getUserClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

/**
 * Manages the project hierarchy: workspaces, folders, and lists.
 * All queries run through the user-scoped client, so RLS enforces access.
 *
 *   GET    /projects?resource=workspaces
 *   GET    /projects?resource=lists&workspaceId=<id>
 *   GET    /projects?resource=list&id=<id>
 *   POST   /projects?resource=workspace|folder|list   (body = fields)
 *   PATCH  /projects?resource=list&id=<id>             (body = partial)
 *   DELETE /projects?resource=list&id=<id>
 */
const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const db = getUserClient(user.accessToken);
  const q = event.queryStringParameters || {};
  const resource = q.resource || 'workspaces';
  const m = method(event);

  try {
    // ---- Reads ----
    if (m === 'GET') {
      if (resource === 'workspaces') {
        const { data, error } = await db
          .from('workspaces')
          .select('*')
          .order('created_at', { ascending: true });
        if (error) throw error;
        return json(200, { workspaces: data });
      }
      if (resource === 'lists') {
        if (!q.workspaceId) return json(400, { error: 'workspaceId required' });
        const { data, error } = await db
          .from('lists')
          .select('*, folders(id, name, position)')
          .eq('workspace_id', q.workspaceId)
          .order('position', { ascending: true });
        if (error) throw error;
        return json(200, { lists: data });
      }
      if (resource === 'list') {
        if (!q.id) return json(400, { error: 'id required' });
        const { data, error } = await db.from('lists').select('*').eq('id', q.id).single();
        if (error) throw error;
        return json(200, { list: data });
      }
      return json(400, { error: `Unknown resource: ${resource}` });
    }

    // ---- Create ----
    if (m === 'POST') {
      const body = parseBody(event);
      const table =
        resource === 'workspace' ? 'workspaces' : resource === 'folder' ? 'folders' : 'lists';

      // For a workspace, also ensure the creator is added as owner-member.
      if (table === 'workspaces') {
        const { data, error } = await db
          .from('workspaces')
          .insert({ ...body, owner_id: user.id })
          .select()
          .single();
        if (error) throw error;
        await db
          .from('workspace_members')
          .insert({ workspace_id: data.id, user_id: user.id, role: 'owner' });
        return json(201, { workspace: data });
      }

      const { data, error } = await db.from(table).insert(body).select().single();
      if (error) throw error;
      return json(201, { [resource]: data });
    }

    // ---- Update ----
    if (m === 'PATCH') {
      if (!q.id) return json(400, { error: 'id required' });
      const body = parseBody(event);
      const table =
        resource === 'workspace' ? 'workspaces' : resource === 'folder' ? 'folders' : 'lists';
      const { data, error } = await db
        .from(table)
        .update(body)
        .eq('id', q.id)
        .select()
        .single();
      if (error) throw error;
      return json(200, { [resource]: data });
    }

    // ---- Delete ----
    if (m === 'DELETE') {
      if (!q.id) return json(400, { error: 'id required' });
      const table =
        resource === 'workspace' ? 'workspaces' : resource === 'folder' ? 'folders' : 'lists';
      const { error } = await db.from(table).delete().eq('id', q.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('projects error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
