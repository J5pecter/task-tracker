import clsx from 'clsx';
import { PRIORITY_META, type TaskPriority, type StatusDef } from '@/types';
import { Flag } from 'lucide-react';

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: meta.color }}
      title={`${meta.label} priority`}
    >
      <Flag className="h-3.5 w-3.5" fill="currentColor" />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status, statuses }: { status: string; statuses?: StatusDef[] }) {
  const def = statuses?.find((s) => s.name === status);
  const color = def?.color ?? '#94a3b8';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {name}
    </span>
  );
}

export function Avatar({
  name,
  email,
  size = 24,
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const label = (name || email || '?').trim();
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  // Deterministic color from the label.
  const hue = Array.from(label).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className={clsx('inline-flex items-center justify-center rounded-full font-semibold text-white')}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundColor: `hsl(${hue} 55% 55%)`,
      }}
      title={label}
    >
      {initials || '?'}
    </span>
  );
}
