const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

/**
 * requireJwt: protects the admin dashboard's own API calls.
 * The admin logs in via /api/auth/login and gets a short-lived JWT.
 */
function requireJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * requireApiKey: protects endpoints meant for OUTSIDE consumers
 * (i.e. not people logging into the dashboard, but other apps/services).
 *
 * Keys are never stored in plaintext — only their bcrypt hash — so a
 * leaked database dump does not expose usable keys.
 *
 * Usage: send header  x-api-key: <key>
 * Optionally enforces a minimum scope ('read' or 'write').
 */
function requireApiKey(minScope = 'read') {
  const scopeRank = { read: 1, write: 2 };

  return (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (!key) {
      return res.status(401).json({ error: 'Missing x-api-key header' });
    }

    const candidates = db
      .prepare('SELECT * FROM api_keys WHERE revoked = 0')
      .all();

    const match = candidates.find((row) => bcrypt.compareSync(key, row.key_hash));

    if (!match) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    if (scopeRank[match.scope] < scopeRank[minScope]) {
      return res.status(403).json({ error: `This key only has '${match.scope}' access` });
    }

    db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(match.id);

    req.apiKey = { id: match.id, label: match.label, scope: match.scope };
    next();
  };
}

module.exports = { requireJwt, requireApiKey };
