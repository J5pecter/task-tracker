import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import {
  GraphNotConnectedError,
  getValidGraphToken,
  listEvents,
  listTodoLists,
  listTodoTasks,
} from './_shared/graph';

/**
 * Proxies live Microsoft Graph reads. Requires a valid Supabase session and a
 * linked Microsoft account. Nothing here is persisted — Outlook data is fetched
 * on demand and cached by React Query on the client.
 *
 *   GET /outlook-tasks?resource=lists
 *   GET /outlook-tasks?resource=tasks&listId=<id>
 *   GET /outlook-tasks?resource=events&start=<iso>&end=<iso>
 */
const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const q = event.queryStringParameters || {};
  const resource = q.resource || 'lists';

  try {
    const token = await getValidGraphToken(user.id);

    if (resource === 'lists') {
      return json(200, { lists: await listTodoLists(token) });
    }

    if (resource === 'tasks') {
      if (!q.listId) return json(400, { error: 'listId is required' });
      return json(200, { tasks: await listTodoTasks(token, q.listId) });
    }

    if (resource === 'events') {
      const now = new Date();
      const start = q.start || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const end = q.end || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
      return json(200, { events: await listEvents(token, start, end) });
    }

    return json(400, { error: `Unknown resource: ${resource}` });
  } catch (err) {
    if (err instanceof GraphNotConnectedError) {
      return json(409, { error: 'not_connected' });
    }
    // eslint-disable-next-line no-console
    console.error('outlook-tasks error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
