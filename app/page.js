'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2, Circle, Clock, LogOut, Plus, Pencil, Trash2,
  ListTodo, Filter, Loader2, User as UserIcon, Sparkles,
  Search, Calendar as CalendarIcon, Flag, AlertTriangle, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const STATUSES = ['Pending', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const statusStyles = {
  'Pending': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300',
  'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300',
};

const statusIcons = {
  'Pending': Circle,
  'In Progress': Clock,
  'Completed': CheckCircle2,
};

const priorityStyles = {
  'Low':    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300',
  'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300',
  'High':   'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300',
};

const priorityDotColor = {
  'Low': 'bg-slate-400',
  'Medium': 'bg-yellow-500',
  'High': 'bg-red-500',
};

// Date helpers
function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Completed') return false;
  const d = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function isDueToday(dueDate) {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

function formatDueDate(dueDate) {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.round((dd - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `In ${diff}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// -------- API helper --------
async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    const u = typeof window !== 'undefined' ? localStorage.getItem('tf_user') : null;
    if (t && u) {
      setToken(t);
      try { setUser(JSON.parse(u)); } catch {}
    }
    setLoading(false);
  }, []);

  const handleAuth = (t, u) => {
    localStorage.setItem('tf_token', t);
    localStorage.setItem('tf_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) return <AuthScreen onAuth={handleAuth} />;
  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}

// =================== AUTH SCREEN ===================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const data = await api(path, { method: 'POST', body });
      onAuth(data.token, data.user);
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/30">
            <ListTodo className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            TaskFlow
          </h1>
          <p className="text-muted-foreground mt-2">Stay organized. Get things done.</p>
        </div>

        <Card className="border-slate-200/60 shadow-xl shadow-indigo-500/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Enter your credentials to access your tasks'
                : 'Sign up to start managing your tasks'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />
          Secure JWT authentication
        </p>
      </div>
    </div>
  );
}

// =================== DASHBOARD ===================
function Dashboard({ token, user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api('/tasks', { token });
      setTasks(data.tasks || []);
    } catch (err) {
      toast.error(err.message);
      if (err.message === 'Unauthorized') onLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filter !== 'All') {
      if (filter === 'Overdue') {
        list = list.filter(t => isOverdue(t.dueDate, t.status));
      } else {
        list = list.filter(t => t.status === filter);
      }
    }
    if (priorityFilter !== 'All') {
      list = list.filter(t => (t.priority || 'Medium') === priorityFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    // sort: overdue first, then by priority, then by dueDate
    const priWeight = { High: 0, Medium: 1, Low: 2 };
    return [...list].sort((a, b) => {
      const aOver = isOverdue(a.dueDate, a.status) ? 0 : 1;
      const bOver = isOverdue(b.dueDate, b.status) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      const pa = priWeight[a.priority || 'Medium'];
      const pb = priWeight[b.priority || 'Medium'];
      if (pa !== pb) return pa - pb;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [tasks, filter, search, priorityFilter]);

  const counts = useMemo(() => ({
    All: tasks.length,
    Pending: tasks.filter(t => t.status === 'Pending').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    Completed: tasks.filter(t => t.status === 'Completed').length,
    Overdue: tasks.filter(t => isOverdue(t.dueDate, t.status)).length,
  }), [tasks]);

  const handleCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleSave = async (taskData) => {
    try {
      if (editingTask) {
        const data = await api(`/tasks/${editingTask.id}`, {
          method: 'PUT', body: taskData, token,
        });
        setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
        toast.success('Task updated');
      } else {
        const data = await api('/tasks', {
          method: 'POST', body: taskData, token,
        });
        setTasks(prev => [data.task, ...prev]);
        toast.success('Task created');
      }
      setDialogOpen(false);
      setEditingTask(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api(`/tasks/${id}`, { method: 'DELETE', token });
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const data = await api(`/tasks/${task.id}`, {
        method: 'PUT', body: { status: newStatus }, token,
      });
      setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
      toast.success(`Marked as ${newStatus}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/30">
              <ListTodo className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                TaskFlow
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Your task manager</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium">{user?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total" value={counts.All} color="from-indigo-500 to-purple-600" icon={ListTodo} />
          <StatCard label="Pending" value={counts.Pending} color="from-amber-500 to-orange-500" icon={Circle} />
          <StatCard label="In Progress" value={counts['In Progress']} color="from-blue-500 to-cyan-500" icon={Clock} />
          <StatCard label="Completed" value={counts.Completed} color="from-emerald-500 to-green-500" icon={CheckCircle2} />
          <StatCard label="Overdue" value={counts.Overdue} color="from-rose-500 to-red-600" icon={AlertTriangle} highlight={counts.Overdue > 0} />
        </div>

        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Flag className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Priorities</SelectItem>
              {PRIORITIES.map(p => (
                <SelectItem key={p} value={p}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${priorityDotColor[p]}`} />
                    {p}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCreate}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Status filter tabs */}
        <div className="mb-6">
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="All">All <span className="ml-1.5 text-xs opacity-60">{counts.All}</span></TabsTrigger>
              <TabsTrigger value="Pending">Pending <span className="ml-1.5 text-xs opacity-60">{counts.Pending}</span></TabsTrigger>
              <TabsTrigger value="In Progress">Active <span className="ml-1.5 text-xs opacity-60">{counts['In Progress']}</span></TabsTrigger>
              <TabsTrigger value="Completed">Done <span className="ml-1.5 text-xs opacity-60">{counts.Completed}</span></TabsTrigger>
              <TabsTrigger value="Overdue" className="data-[state=active]:text-red-600">
                Overdue <span className="ml-1.5 text-xs opacity-60">{counts.Overdue}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState filter={filter} onCreate={handleCreate} />
        ) : (
          <div className="grid gap-3">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingTask(null); }}
        task={editingTask}
        onSave={handleSave}
      />
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon, highlight }) {
  return (
    <Card className={`overflow-hidden relative group hover:shadow-lg transition-shadow ${highlight ? 'ring-2 ring-red-300 dark:ring-red-500/40' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${highlight ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</p>
          </div>
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ filter, onCreate }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center mb-4">
          <ListTodo className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold">
          {filter === 'All' ? 'No tasks yet' : `No ${filter.toLowerCase()} tasks`}
        </h3>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          {filter === 'All'
            ? 'Create your first task to get started'
            : 'Switch filter or add a new task'}
        </p>
        <Button
          onClick={onCreate}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const StatusIcon = statusIcons[task.status];
  const priority = task.priority || 'Medium';
  const overdue = isOverdue(task.dueDate, task.status);
  const dueToday = isDueToday(task.dueDate) && task.status !== 'Completed';

  return (
    <Card className={`group hover:shadow-md transition-all ${
      overdue
        ? 'border-red-300 dark:border-red-500/40 bg-red-50/40 dark:bg-red-500/5 hover:border-red-400'
        : 'hover:border-indigo-200 dark:hover:border-indigo-500/30'
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <button
            onClick={() => {
              const next = task.status === 'Completed' ? 'Pending' :
                           task.status === 'Pending' ? 'In Progress' : 'Completed';
              onStatusChange(task, next);
            }}
            className="mt-0.5 transition-transform hover:scale-110"
            title="Click to cycle status"
          >
            <StatusIcon className={`h-6 w-6 ${
              task.status === 'Completed' ? 'text-emerald-500' :
              task.status === 'In Progress' ? 'text-blue-500' : 'text-amber-500'
            }`} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2 h-2 rounded-full ${priorityDotColor[priority]}`} title={`${priority} priority`} />
                <h3 className={`font-semibold text-base ${task.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${priorityStyles[priority]} font-medium text-xs`}>
                  <Flag className="h-3 w-3 mr-1" />
                  {priority}
                </Badge>
                <Badge variant="outline" className={`${statusStyles[task.status]} font-medium`}>
                  {task.status}
                </Badge>
              </div>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1.5">{task.description}</p>
            )}
            {task.dueDate && (
              <div className={`inline-flex items-center gap-1.5 text-xs mt-2 px-2 py-1 rounded-md font-medium ${
                overdue
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                  : dueToday
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
              }`}>
                {overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
                {overdue ? `Overdue \u2014 ${formatDueDate(task.dueDate)}` : `Due ${formatDueDate(task.dueDate)}`}
              </div>
            )}
            <div className="flex items-center gap-3 mt-3">
              <Select
                value={task.status}
                onValueChange={(v) => onStatusChange(task, v)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={() => onEdit(task)} className="h-8">
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The task &quot;{task.title}&quot; will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(task.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskDialog({ open, onOpenChange, task, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'Pending', priority: 'Medium', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      });
    } else {
      setForm({ title: '', description: '', status: 'Pending', priority: 'Medium', dueDate: '' });
    }
  }, [task, open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    await onSave({
      ...form,
      dueDate: form.dueDate || null,
    });
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {task ? 'Update the details of your task.' : 'Add a new task to your list.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add some details (optional)..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${priorityDotColor[p]}`} />
                          {p}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                Due Date <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="flex-1"
                />
                {form.dueDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, dueDate: '' })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.title.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
