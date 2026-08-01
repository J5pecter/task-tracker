import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from 'date-fns';

export function formatDueDate(iso: string | null): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const overdue = isPast(d) && !isToday(d);
  if (isToday(d)) return { label: 'Today', overdue: false };
  if (isTomorrow(d)) return { label: 'Tomorrow', overdue: false };
  return { label: format(d, 'MMM d'), overdue };
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy · h:mm a');
}

export function timeAgo(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function formatMinutes(min: number | null | undefined): string {
  if (!min) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
