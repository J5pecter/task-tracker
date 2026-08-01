import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getAdminClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

/**
 * Workspace membership + invites. Reads/writes go through the service-role
 * client, but every call is authorized manually: reads require membership,
 * writes require workspace ownership.
 *
 *   GET    /members?workspaceId=<id>              -> { members[], invites[] }
 *   POST   /members?workspaceId=<id>              body: { email, role? }  (invite / add)
 *   DELETE /members?workspaceId=<id>&userId=<id>  -> remove a member
 *   DELETE /members?action=invite&id=<id>         -> cancel a pending invite
 */
const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const admin = getAdminClient();
  const q = event.queryStringParameters || {};
  const m = method(event);

  async function isMember(workspaceId: string): Promise<boolean> {
    const { data } = await admin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user!.id)
      .maybeSingle();
    return !!data;
  }

  async function isOwner(workspaceId: string): Promise<boolean> {
    const { data } = await admin
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();
    return data?.owner_id === user!.id;
  }

  try {
    if (m === 'GET') {
      const wsId = q.workspaceId;
      if (!wsId) return json(400, { error: 'workspaceId required' });
      if (!(await isMember(wsId))) return json(403, { error: 'Not a member' });

      const { data: rows, error } = await admin
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', wsId);
      if (error) throw error;

      const ids = (rows || []).map((r) => r.user_id);
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      const byId = new Map((profiles || []).map((p) => [p.id, p]));

      const members = (rows || []).map((r) => ({
        user_id: r.user_id,
        role: r.role,
        profile: byId.get(r.user_id) ?? null,
      }));

      const { data: invites } = await admin
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: true });

      return json(200, { members, invites: invites || [] });
    }

    if (m === 'POST') {
      const wsId = q.workspaceId;
      if (!wsId) return json(400, { error: 'workspaceId required' });
      if (!(await isOwner(wsId))) return json(403, { error: 'Only the owner can invite' });

      const { email, role } = parseBody<{ email: string; role?: string }>(event);
      const clean = (email || '').trim().toLowerCase();
      if (!clean) return json(400, { error: 'email required' });
      const memberRole = role || 'member';

      // If the email already has an account, add them straight away.
      const { data: existing } = await admin
        .from('user_profiles')
        .select('id')
        .ilike('email', clean)
        .maybeSingle();

      if (existing) {
        const { error } = await admin
          .from('workspace_members')
          .upsert(
            { workspace_id: wsId, user_id: existing.id, role: memberRole },
            { onConflict: 'workspace_id,user_id' },
          );
        if (error) throw error;
        return json(201, { added: true });
      }

      // Otherwise record a pending invite (consumed when they sign up).
      const { error } = await admin
        .from('workspace_invites')
        .upsert(
          { workspace_id: wsId, email: clean, role: memberRole, invited_by: user.id },
          { onConflict: 'workspace_id,email' },
        );
      if (error) throw error;
      return json(201, { invited: true });
    }

    if (m === 'DELETE') {
      if (q.action === 'invite') {
        if (!q.id) return json(400, { error: 'id required' });
        const { data: inv } = await admin
          .from('workspace_invites')
          .select('workspace_id')
          .eq('id', q.id)
          .maybeSingle();
        if (!inv) return json(404, { error: 'Invite not found' });
        if (!(await isOwner(inv.workspace_id))) return json(403, { error: 'Only the owner can manage invites' });
        const { error } = await admin.from('workspace_invites').delete().eq('id', q.id);
        if (error) throw error;
        return json(200, { ok: true });
      }

      const wsId = q.workspaceId;
      if (!wsId || !q.userId) return json(400, { error: 'workspaceId and userId required' });
      if (!(await isOwner(wsId))) return json(403, { error: 'Only the owner can remove members' });
      if (q.userId === user.id) return json(400, { error: 'The owner cannot remove themselves' });
      const { error } = await admin
        .from('workspace_members')
        .delete()
        .eq('workspace_id', wsId)
        .eq('user_id', q.userId);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('members error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
