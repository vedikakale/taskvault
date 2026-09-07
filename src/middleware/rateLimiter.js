const rateLimit = require('express-rate-limit');

// Generous limit for the admin dashboard (trusted, logged-in users)
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for the public/external API — this is the surface
// outside people hit, so it needs to survive abuse and scraping attempts.
const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
});

// Very strict limit on login attempts to blunt brute-force/credential stuffing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

module.exports = { dashboardLimiter, publicApiLimiter, loginLimiter };
