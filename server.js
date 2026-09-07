require('dotenv').config({ quiet: true });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const taskRoutes = require('./src/routes/tasks');
const apiKeyRoutes = require('./src/routes/apiKeys');
const publicApiRoutes = require('./src/routes/publicApi');
const { dashboardLimiter } = require('./src/middleware/rateLimiter');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and set a strong secret.');
  process.exit(1);
}

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "upgrade-insecure-requests": null,
        "script-src-attr": ["'unsafe-inline'"],
      },
    },
  })
);


app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));

// Serve the admin dashboard's static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Internal dashboard API (JWT-protected where needed)
app.use('/api/auth', authRoutes);
app.use('/api/tasks', dashboardLimiter, taskRoutes);
app.use('/api/keys', dashboardLimiter, apiKeyRoutes);

// External API — this is the surface meant for outside consumers,
// secured by API key instead of a login session.
app.use('/api/v1', publicApiRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler — never leak stack traces to clients
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`TaskVault running on http://localhost:${PORT}`));
}

module.exports = app;
