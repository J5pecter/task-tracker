import { useState } from 'react';
import { Reply, Trash2 } from 'lucide-react';
import { useAddComment, useComments, useDeleteComment } from '@/hooks/useComments';
import { Avatar } from './ui/Badges';
import { timeAgo } from '@/lib/format';
import { LoadingState } from './ui/Spinner';
import type { Comment } from '@/types';

export function CommentThread({ taskId }: { taskId: string }) {
  const { data: comments, isLoading } = useComments(taskId);
  const add = useAddComment(taskId);
  const [body, setBody] = useState('');

  function submit() {
    if (!body.trim()) return;
    add.mutate({ task_id: taskId, body: body.trim() });
    setBody('');
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Comments</h3>
      <div className="mb-4 flex gap-2">
        <textarea
          className="input resize-y"
          rows={2}
          placeholder="Write a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <button className="btn-primary self-end" onClick={submit} disabled={add.isPending}>
          Send
        </button>
      </div>
      {isLoading ? (
        <LoadingState label="Loading comments…" />
      ) : (
        <div className="space-y-4">
          {(comments || []).map((c) => (
            <CommentItem key={c.id} comment={c} taskId={taskId} />
          ))}
          {comments?.length === 0 && (
            <p className="text-sm text-slate-400">No comments yet. Start the conversation.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, taskId }: { comment: Comment; taskId: string }) {
  const add = useAddComment(taskId);
  const del = useDeleteComment(taskId);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');

  function submitReply() {
    if (!reply.trim()) return;
    add.mutate({ task_id: taskId, body: reply.trim(), parent_comment_id: comment.id });
    setReply('');
    setReplying(false);
  }

  return (
    <div className="flex gap-2">
      <Avatar name={comment.author?.full_name} email={comment.author?.email} size={28} />
      <div className="flex-1">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              {comment.author?.full_name || comment.author?.email || 'User'}
            </span>
            <span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 px-1 text-xs text-slate-400">
          <button className="flex items-center gap-1 hover:text-slate-600" onClick={() => setReplying((r) => !r)}>
            <Reply className="h-3 w-3" /> Reply
          </button>
          <button className="flex items-center gap-1 hover:text-red-600" onClick={() => del.mutate(comment.id)}>
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>

        {replying && (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              className="input"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitReply()}
              placeholder="Reply…"
            />
            <button className="btn-primary" onClick={submitReply}>
              Reply
            </button>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-3">
            {comment.replies.map((r) => (
              <CommentItem key={r.id} comment={r} taskId={taskId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
