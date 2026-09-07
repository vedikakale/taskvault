const express = require('express');
const { randomUUID } = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireApiKey } = require('../middleware/auth');
const { publicApiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.use(publicApiLimiter);

// Read-only access — any valid API key with at least 'read' scope
router.get('/tasks', requireApiKey('read'), (req, res) => {
  const tasks = db
    .prepare('SELECT id, title, status, priority, created_at FROM tasks ORDER BY created_at DESC')
    .all();
  res.json({ data: tasks, count: tasks.length });
});

router.get('/tasks/:id', requireApiKey('read'), (req, res) => {
  const task = db
    .prepare('SELECT id, title, description, status, priority, created_at FROM tasks WHERE id = ?')
    .get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ data: task });
});

// Write access — requires a key explicitly granted 'write' scope
router.post(
  '/tasks',
  requireApiKey('write'),
  [body('title').trim().isLength({ min: 1, max: 200 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = randomUUID();
    const { title, description = null, priority = 'medium' } = req.body;

    db.prepare(
      'INSERT INTO tasks (id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)'
    ).run(id, title, description, 'pending', priority);

    res.status(201).json({ data: db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) });
  }
);

module.exports = router;
