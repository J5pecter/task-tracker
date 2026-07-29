import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Inbox,
  ListTodo,
  LogOut,
  Mail,
  Plus,
  Settings as SettingsIcon,
  CalendarDays,
} from 'lucide-react';
import clsx from 'clsx';
import { useWorkspaces, useLists, useCreateList, useCreateWorkspace } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ui/Toast';
import { Avatar } from './ui/Badges';
import { Modal } from './ui/Modal';

export function Sidebar() {
  const { data: workspaces } = useWorkspaces();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <CheckSquare className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold text-slate-800">TaskTracker</span>
      </div>

      <nav className="px-2">
        <SidebarLink to="/" icon={Inbox} label="My Tasks" end />
        <SidebarLink to="/calendar" icon={CalendarDays} label="Calendar" />
        <SidebarLink to="/outlook" icon={Mail} label="Outlook" />
      </nav>

      <div className="scrollbar-thin mt-4 flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Workspaces
          </span>
          <NewWorkspaceButton />
        </div>
        {workspaces?.map((ws) => (
          <WorkspaceTree key={ws.id} workspaceId={ws.id} name={ws.name} color={ws.color} />
        ))}
      </div>

      <div className="border-t border-slate-200 p-2">
        <NavLink
          to="/settings"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </NavLink>
        <div className="mt-1 flex items-center gap-2 rounded-md px-2 py-2">
          <Avatar name={user?.user_metadata?.full_name} email={user?.email} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-700">
              {user?.user_metadata?.full_name || user?.email}
            </div>
          </div>
          <button onClick={() => signOut()} title="Sign out" className="text-slate-400 hover:text-slate-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: typeof Inbox;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function WorkspaceTree({
  workspaceId,
  name,
  color,
}: {
  workspaceId: string;
  name: string;
  color: string;
}) {
  const [open, setOpen] = useState(true);
  const { data: lists } = useLists(open ? workspaceId : undefined);
  const createList = useCreateList(workspaceId);
  const { notify } = useToast();
  const [adding, setAdding] = useState(false);
  const [listName, setListName] = useState('');

  async function addList() {
    if (!listName.trim()) return;
    try {
      await createList.mutateAsync({ name: listName.trim(), workspace_id: workspaceId });
      setListName('');
      setAdding(false);
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  return (
    <div className="mb-1">
      <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-slate-100">
        <button onClick={() => setOpen((o) => !o)} className="text-slate-400">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
        <span className="flex-1 truncate text-sm font-medium text-slate-700">{name}</span>
        <button
          onClick={() => setAdding(true)}
          className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600"
          title="Add list"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="ml-5 border-l border-slate-100 pl-2">
          {lists?.map((l) => (
            <NavLink
              key={l.id}
              to={`/list/${l.id}`}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <ListTodo className="h-3.5 w-3.5" style={{ color: l.color }} />
              <span className="truncate">{l.name}</span>
            </NavLink>
          ))}
          {adding && (
            <div className="px-1 py-1">
              <input
                autoFocus
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addList();
                  if (e.key === 'Escape') setAdding(false);
                }}
                onBlur={() => setAdding(false)}
                placeholder="List name…"
                className="input py-1 text-sm"
              />
            </div>
          )}
          {lists && lists.length === 0 && !adding && (
            <div className="px-2 py-1 text-xs text-slate-400">No lists yet</div>
          )}
        </div>
      )}
    </div>
  );
}

function NewWorkspaceButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const create = useCreateWorkspace();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function submit() {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim() });
      notify('Workspace created', 'success');
      setName('');
      setOpen(false);
      navigate('/');
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-slate-400 hover:text-slate-600" title="New workspace">
        <Plus className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New workspace">
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submit} disabled={create.isPending}>
              Create
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
