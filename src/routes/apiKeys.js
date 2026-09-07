const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireJwt } = require('../middleware/auth');

const router = express.Router();
router.use(requireJwt);

// List keys (never returns the raw key, only metadata)
router.get('/', (req, res) => {
  const keys = db
    .prepare('SELECT id, label, scope, created_at, last_used_at, revoked FROM api_keys ORDER BY created_at DESC')
    .all();
  res.json(keys);
});

// Issue a brand-new API key for an outside consumer.
// The raw key is shown exactly once, at creation time, then discarded —
// only its bcrypt hash is persisted.
router.post(
  '/',
  [body('label').trim().isLength({ min: 1, max: 100 }), body('scope').isIn(['read', 'write'])],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const rawKey = `tv_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = bcrypt.hashSync(rawKey, 10);
    const id = randomUUID();

    db.prepare(
      'INSERT INTO api_keys (id, key_hash, label, scope) VALUES (?, ?, ?, ?)'
    ).run(id, keyHash, req.body.label, req.body.scope);

    res.status(201).json({
      id,
      label: req.body.label,
      scope: req.body.scope,
      key: rawKey, // shown once — copy it now, it cannot be retrieved again
    });
  }
);

router.delete('/:id', (req, res) => {
  const result = db.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Key not found' });
  res.status(204).send();
});

module.exports = router;
