import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/mongodb';
import { signToken, getUserFromRequest } from '@/lib/auth';

const ALLOWED_STATUSES = ['Pending', 'In Progress', 'Completed'];
const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High'];

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function handler(request, ctx) {
  const params = await ctx.params;
  const segments = (params?.path) || [];
  const route = '/' + segments.join('/');
  const method = request.method;

  try {
    // ---- AUTH ----
    if (route === '/auth/register' && method === 'POST') {
      const { name, email, password } = await request.json();
      if (!name || !email || !password) return err('All fields are required');
      if (password.length < 6) return err('Password must be at least 6 characters');
      const db = await getDb();
      const users = db.collection('users');
      const existing = await users.findOne({ email: email.toLowerCase() });
      if (existing) return err('User already exists', 409);
      const hashed = await bcrypt.hash(password, 10);
      const user = {
        id: uuidv4(),
        name,
        email: email.toLowerCase(),
        password: hashed,
        createdAt: new Date().toISOString(),
      };
      await users.insertOne(user);
      const token = signToken({ id: user.id, email: user.email });
      return json({ token, user: { id: user.id, name: user.name, email: user.email } }, 201);
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json();
      if (!email || !password) return err('Email and password required');
      const db = await getDb();
      const users = db.collection('users');
      const user = await users.findOne({ email: email.toLowerCase() });
      if (!user) return err('Invalid credentials', 401);
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return err('Invalid credentials', 401);
      const token = signToken({ id: user.id, email: user.email });
      return json({ token, user: { id: user.id, name: user.name, email: user.email } });
    }

    if (route === '/auth/me' && method === 'GET') {
      const decoded = getUserFromRequest(request);
      if (!decoded) return err('Unauthorized', 401);
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: decoded.id });
      if (!user) return err('User not found', 404);
      return json({ user: { id: user.id, name: user.name, email: user.email } });
    }

    // ---- TASKS (auth required) ----
    if (route.startsWith('/tasks')) {
      const decoded = getUserFromRequest(request);
      if (!decoded) return err('Unauthorized', 401);
      const db = await getDb();
      const tasks = db.collection('tasks');

      // GET /tasks  or  GET /tasks?status=Pending
      if (route === '/tasks' && method === 'GET') {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const query = { userId: decoded.id };
        if (status && ALLOWED_STATUSES.includes(status)) query.status = status;
        const list = await tasks.find(query).sort({ createdAt: -1 }).toArray();
        const cleaned = list.map(({ _id, ...rest }) => rest);
        return json({ tasks: cleaned });
      }

      // POST /tasks  -> create
      if (route === '/tasks' && method === 'POST') {
        const { title, description, status, priority, dueDate } = await request.json();
        if (!title || !title.trim()) return err('Title is required');
        const finalStatus = ALLOWED_STATUSES.includes(status) ? status : 'Pending';
        const finalPriority = ALLOWED_PRIORITIES.includes(priority) ? priority : 'Medium';
        const task = {
          id: uuidv4(),
          userId: decoded.id,
          title: title.trim(),
          description: (description || '').trim(),
          status: finalStatus,
          priority: finalPriority,
          dueDate: dueDate || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await tasks.insertOne(task);
        const { _id, ...rest } = task;
        return json({ task: rest }, 201);
      }

      // /tasks/:id
      const idMatch = route.match(/^\/tasks\/([^/]+)$/);
      if (idMatch) {
        const taskId = idMatch[1];
        if (method === 'GET') {
          const t = await tasks.findOne({ id: taskId, userId: decoded.id });
          if (!t) return err('Task not found', 404);
          const { _id, ...rest } = t;
          return json({ task: rest });
        }
        if (method === 'PUT' || method === 'PATCH') {
          const body = await request.json();
          const update = {};
          if (body.title !== undefined) {
            if (!body.title.trim()) return err('Title cannot be empty');
            update.title = body.title.trim();
          }
          if (body.description !== undefined) update.description = (body.description || '').trim();
          if (body.status !== undefined) {
            if (!ALLOWED_STATUSES.includes(body.status)) return err('Invalid status');
            update.status = body.status;
          }
          if (body.priority !== undefined) {
            if (!ALLOWED_PRIORITIES.includes(body.priority)) return err('Invalid priority');
            update.priority = body.priority;
          }
          if (body.dueDate !== undefined) {
            update.dueDate = body.dueDate || null;
          }
          update.updatedAt = new Date().toISOString();
          const result = await tasks.findOneAndUpdate(
            { id: taskId, userId: decoded.id },
            { $set: update },
            { returnDocument: 'after' }
          );
          const doc = result?.value || result;
          if (!doc) return err('Task not found', 404);
          const { _id, ...rest } = doc;
          return json({ task: rest });
        }
        if (method === 'DELETE') {
          const r = await tasks.deleteOne({ id: taskId, userId: decoded.id });
          if (r.deletedCount === 0) return err('Task not found', 404);
          return json({ success: true });
        }
      }
    }

    // health check
    if (route === '/' || route === '/health') {
      return json({ status: 'ok', service: 'task-manager-api' });
    }

    return err('Route not found', 404);
  } catch (e) {
    console.error('API error:', e);
    return err(e.message || 'Internal server error', 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
