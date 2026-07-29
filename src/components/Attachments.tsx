import { useRef, useState } from 'react';
import { Download, FileText, Loader2, Paperclip, Trash2, UploadCloud } from 'lucide-react';
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  getAttachmentUrl,
} from '@/hooks/useAttachments';
import { useToast } from './ui/Toast';
import type { Attachment } from '@/types';

function formatBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function Attachments({ taskId }: { taskId: string }) {
  const { data: attachments, isLoading } = useAttachments(taskId);
  const upload = useUploadAttachment(taskId);
  const del = useDeleteAttachment(taskId);
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file);
        notify(`Uploaded ${file.name}`, 'success');
      } catch (e) {
        notify(`Upload failed: ${(e as Error).message}`, 'error');
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  async function open(a: Attachment) {
    try {
      const url = await getAttachmentUrl(a.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-slate-400" />
        <span className="label mb-0">Attachments</span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {upload.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        ) : (
          <UploadCloud className="h-5 w-5 text-slate-400" />
        )}
        <span className="text-xs text-slate-500">
          {upload.isPending ? 'Uploading…' : 'Drop files here or click to upload'}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="mt-3 space-y-1">
        {isLoading && <div className="text-xs text-slate-400">Loading…</div>}
        {attachments?.map((a) => (
          <div
            key={a.id}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
            <button
              className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 hover:text-brand-600"
              onClick={() => open(a)}
              title={a.file_name}
            >
              {a.file_name}
            </button>
            <span className="text-xs text-slate-400">{formatBytes(a.size_bytes)}</span>
            <button
              className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-brand-600"
              onClick={() => open(a)}
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600"
              onClick={() => del.mutate(a.id)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {attachments?.length === 0 && !isLoading && (
          <p className="text-xs text-slate-400">No attachments yet.</p>
        )}
      </div>
    </div>
  );
}
