const express = require('express');
const { randomUUID } = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireJwt } = require('../middleware/auth');

const router = express.Router();
router.use(requireJwt);

const taskValidators = [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['pending', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
];

router.get('/', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json(tasks);
});

router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

router.post('/', taskValidators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const id = randomUUID();
  const { title, description = null, status = 'pending', priority = 'medium' } = req.body;

  db.prepare(
    'INSERT INTO tasks (id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)'
  ).run(id, title, description, status, priority);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(task);
});

router.put('/:id', taskValidators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const {
    title = existing.title,
    description = existing.description,
    status = existing.status,
    priority = existing.priority,
  } = req.body;

  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(title, description, status, priority, req.params.id);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
});

module.exports = router;
