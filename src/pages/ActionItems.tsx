import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  Download,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import clsx from 'clsx';
import { differenceInCalendarDays, format, isPast, isToday } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

/* ------------------------------------------------------------------ model */
type Status = 'Open' | 'In Progress' | 'Blocked' | 'Done';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

interface Item {
  id: string;
  title: string;
  owner: string;
  status: Status;
  priority: Priority;
  category: string;
  due: string | null; // yyyy-mm-dd
  created: string;
}

const STATUS: Record<Status, string> = {
  Open: '#7dd3fc',
  'In Progress': '#b45cff',
  Blocked: '#ff6b8b',
  Done: '#5ef2c0',
};
const PRIORITY: Record<Priority, string> = {
  Critical: '#ff6b8b',
  High: '#ffb057',
  Medium: '#7dd3fc',
  Low: '#9aa6b8',
};
const STATUSES = Object.keys(STATUS) as Status[];
const PRIORITIES = Object.keys(PRIORITY) as Priority[];

const KEY = 'aurora_action_items_v1';
const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

function load(): Item[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Item[];
  } catch {
    /* ignore */
  }
  // seed a few sample items on first run
  const today = new Date();
  const iso = (d: number) => format(new Date(today.getTime() + d * 864e5), 'yyyy-MM-dd');
  return [
    { id: uid(), title: 'Finalise Q3 onboarding deck', owner: 'Parth', status: 'In Progress', priority: 'High', category: 'Onboarding', due: iso(2), created: iso(-3) },
    { id: uid(), title: 'Fix rejection-flow bug', owner: 'Rakesh', status: 'Blocked', priority: 'Critical', category: 'Engineering', due: iso(-1), created: iso(-5) },
    { id: uid(), title: 'UAT sign-off checklist', owner: 'Umesh', status: 'Open', priority: 'Medium', category: 'QA', due: iso(5), created: iso(-1) },
    { id: uid(), title: 'Publish analytics S2S doc', owner: 'Naveen', status: 'Done', priority: 'Low', category: 'Docs', due: iso(-2), created: iso(-8) },
  ];
}
function save(items: Item[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ helpers */
const isOverdue = (i: Item) => !!i.due && i.status !== 'Done' && isPast(new Date(i.due)) && !isToday(new Date(i.due));
const dueSoon = (i: Item) => {
  if (!i.due || i.status === 'Done') return false;
  const d = differenceInCalendarDays(new Date(i.due), new Date());
  return d >= 0 && d <= 7;
};
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
function Breakdown({ title, entries }: { title: string; entries: { name: string; count: number; color: string }[] }) {
  const max = Math.max(1, ...entries.map((e) => e.count));
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="space-y-2.5">
        {entries.length === 0 && <p className="text-xs text-slate-400">No data.</p>}
        {entries.map((e) => (
          <div key={e.name} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 truncate text-slate-500">{e.name}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full" style={{ width: `${(e.count / max) * 100}%`, background: e.color, boxShadow: `0 0 8px ${e.color}66` }} />
            </span>
            <span className="w-6 text-right font-semibold tabular-nums">{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default function ActionItems() {
  const { notify } = useToast();
  const [items, setItems] = useState<Item[]>(load);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fOwner, setFOwner] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function persist(next: Item[]) {
    setItems(next);
    save(next);
  }
  function upsert(it: Item) {
    persist(items.some((x) => x.id === it.id) ? items.map((x) => (x.id === it.id ? it : x)) : [it, ...items]);
  }
  function remove(id: string) {
    const it = items.find((x) => x.id === id);
    if (it && confirm(`Delete "${it.title}"?`)) {
      persist(items.filter((x) => x.id !== id));
      notify('Action item deleted', 'success');
    }
  }

  const owners = useMemo(() => [...new Set(items.map((i) => i.owner).filter(Boolean))].sort(), [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const inProg = items.filter((i) => i.status === 'In Progress').length;
    const done = items.filter((i) => i.status === 'Done').length;
    const overdue = items.filter(isOverdue).length;
    const byStatus = STATUSES.map((s) => ({ name: s, count: items.filter((i) => i.status === s).length, color: STATUS[s] }));
    const byPriority = PRIORITIES.map((p) => ({ name: p, count: items.filter((i) => i.priority === p).length, color: PRIORITY[p] }));
    const byOwner = owners.map((o) => ({ name: o, count: items.filter((i) => i.owner === o).length, color: '#8be7ff' })).sort((a, b) => b.count - a.count).slice(0, 6);
    const attention = items.filter((i) => isOverdue(i) || (i.priority === 'Critical' && i.status !== 'Done'));
    return { total, inProg, done, overdue, byStatus, byPriority, byOwner, attention };
  }, [items, owners]);

  const filtered = useMemo(
    () =>
      items
        .filter((i) => (!fStatus || i.status === fStatus) && (!fOwner || i.owner === fOwner))
        .filter((i) => !q || (i.title + i.owner + i.category).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')),
    [items, q, fStatus, fOwner],
  );

  function exportCsv() {
    const rows = [['Title', 'Owner', 'Status', 'Priority', 'Category', 'Due'], ...items.map((i) => [i.title, i.owner, i.status, i.priority, i.category, i.due || ''])];
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'action-items.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const lines = text.split(/\r?\n/).filter(Boolean);
      const head = lines.shift()?.toLowerCase().split(',') ?? [];
      const idx = (names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));
      const ti = idx(['title', 'item', 'task']), oi = idx(['owner', 'assignee', 'person']), si = idx(['status']), pi = idx(['priority']), ci = idx(['category']), di = idx(['due', 'date']);
      const parseRow = (line: string) => {
        const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')) ?? [];
        return cells;
      };
      const added: Item[] = lines.map((l) => {
        const c = parseRow(l);
        const st = (STATUSES.find((s) => s.toLowerCase() === (c[si] || '').trim().toLowerCase()) || 'Open') as Status;
        const pr = (PRIORITIES.find((p) => p.toLowerCase() === (c[pi] || '').trim().toLowerCase()) || 'Medium') as Priority;
        return { id: uid(), title: (c[ti] || 'Untitled').trim(), owner: (c[oi] || '').trim(), status: st, priority: pr, category: (c[ci] || '').trim(), due: (c[di] || '').trim() || null, created: format(new Date(), 'yyyy-MM-dd') };
      }).filter((i) => i.title);
      persist([...added, ...items]);
      notify(`Imported ${added.length} action item${added.length !== 1 ? 's' : ''}`, 'success');
    });
    e.target.value = '';
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-brand-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Action Items</h1>
            <p className="text-sm text-slate-500">Owners, status, and due dates for every action item.</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</button>
          <button className="btn-secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> New item</button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        {/* stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={Circle} label="Total items" value={stats.total} color="#8be7ff" />
          <Stat icon={Loader2} label="In progress" value={stats.inProg} color="#b45cff" />
          <Stat icon={CheckCircle2} label="Completed" value={stats.done} color="#5ef2c0" />
          <Stat icon={AlertTriangle} label="Overdue" value={stats.overdue} color="#ff6b8b" />
        </div>

        {/* breakdowns */}
        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <Breakdown title="By status" entries={stats.byStatus} />
          <Breakdown title="By priority" entries={stats.byPriority} />
          <Breakdown title="By owner" entries={stats.byOwner} />
        </div>

        {/* attention */}
        {stats.attention.length > 0 && (
          <div className="card mb-5 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <AlertTriangle className="h-4 w-4 text-[#ff6b8b]" /> Needs attention ({stats.attention.length})
            </h3>
            <div className="flex flex-col gap-2">
              {stats.attention.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="flex-1 truncate text-sm font-medium">{i.title}</span>
                  <span className="text-xs text-slate-400">{i.owner}</span>
                  <Chip label={i.priority} color={PRIORITY[i.priority]} />
                  {i.due && <span className={clsx('text-xs', isOverdue(i) ? 'text-[#ff6b8b]' : 'text-slate-400')}>{format(new Date(i.due), 'MMM d')}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* filters + table */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input className="input max-w-xs" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input w-40" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input w-40" value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
            <option value="">All owners</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title="No action items" description="Add one, or import a CSV, to start tracking." />
        ) : (
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px_110px_100px_72px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Item</span><span>Owner</span><span>Status</span><span>Priority</span><span>Due</span><span />
            </div>
            {filtered.map((i) => (
              <div key={i.id} className="grid grid-cols-[1fr_120px_120px_110px_100px_72px] items-center gap-3 border-b border-slate-100 px-4 py-2.5 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{i.title}</div>
                  {i.category && <div className="text-xs text-slate-400">{i.category}</div>}
                </div>
                <span className="truncate text-sm text-slate-600">{i.owner || '—'}</span>
                <Chip label={i.status} color={STATUS[i.status]} />
                <Chip label={i.priority} color={PRIORITY[i.priority]} />
                <span className={clsx('inline-flex items-center gap-1 text-xs', isOverdue(i) ? 'text-[#ff6b8b]' : dueSoon(i) ? 'text-[#ffb057]' : 'text-slate-500')}>
                  {i.due && <CalendarClock className="h-3.5 w-3.5" />}{i.due ? format(new Date(i.due), 'MMM d') : '—'}
                </span>
                <div className="flex justify-end gap-1">
                  <button className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-white" title="Edit" onClick={() => { setEditing(i); setShowForm(true); }}><Pencil className="h-4 w-4" /></button>
                  <button className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-[#ff6b8b]" title="Delete" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ItemForm
          item={editing}
          onClose={() => setShowForm(false)}
          onSave={(it) => { upsert(it); setShowForm(false); notify(editing ? 'Item updated' : 'Item added', 'success'); }}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof Circle; label: string; value: number; color: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-extrabold tabular-nums" style={{ color }}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function ItemForm({ item, onClose, onSave }: { item: Item | null; onClose: () => void; onSave: (i: Item) => void }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [owner, setOwner] = useState(item?.owner ?? '');
  const [status, setStatus] = useState<Status>(item?.status ?? 'Open');
  const [priority, setPriority] = useState<Priority>(item?.priority ?? 'Medium');
  const [category, setCategory] = useState(item?.category ?? '');
  const [due, setDue] = useState(item?.due ?? '');
  const { notify } = useToast();

  function submit() {
    if (!title.trim()) return notify('Title is required', 'error');
    onSave({
      id: item?.id ?? uid(),
      title: title.trim(), owner: owner.trim(), status, priority,
      category: category.trim(), due: due || null,
      created: item?.created ?? format(new Date(), 'yyyy-MM-dd'),
    });
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Edit action item' : 'New action item'} size="lg">
      <div className="space-y-4">
        <div><label className="label">Title</label><input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Owner</label><input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Parth" /></div>
          <div><label className="label">Category</label><input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Engineering" /></div>
          <div><label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div><label className="label">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
          </div>
          <div><label className="label">Due date</label><input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>{item ? 'Save changes' : 'Add item'}</button>
        </div>
      </div>
    </Modal>
  );
}
