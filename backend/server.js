import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';
import { signToken, comparePassword, hashPassword, authMiddleware } from './auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet());
app.use(express.json());
app.use(cors());

const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin && corsOrigin.trim() !== '') {
  app.use(cors({ origin: corsOrigin, credentials: false }));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Users
app.post('/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email',
      [name, email, hashed]
    );
    const user = result.rows[0];
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/users/me', authMiddleware, async (req, res) => {
  try {
    const { id, name, email } = req.user; // set by authMiddleware
    res.json({ id, name, email });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
});

app.post('/users/logout', authMiddleware, (_req, res) => {
  // Con JWT en localStorage, el cierre de sesión es del lado del cliente.
  // Este endpoint existe solo por simetría; responde 200.
  res.json({ ok: true });
});

app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const result = await query('SELECT id, name, email, password FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const safeUser = { id: user.id, name: user.name, email: user.email };
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Tasks
app.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const result = await query(
      'INSERT INTO tasks (user_id, title, description) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, title, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/tasks/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (parseInt(userId, 10) !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/tasks/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = result.rows[0];
    if (task.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    let nextStatus = 'pending';
    if (task.status === 'pending') nextStatus = 'in_progress';
    else if (task.status === 'in_progress') nextStatus = 'done';
    else nextStatus = 'done';
    const updated = await query('UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *', [nextStatus, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
