# TaskVault 🔐

A small, self-contained **Task Management API with an admin dashboard**, built to demonstrate secure backend design: session-based auth for the dashboard, scoped API keys for outside consumers, rate limiting, and input validation — all on a real SQLite database.

This project is intentionally small enough to read end-to-end in one sitting, but structured the way a production service would be.

## Why this project exists

Most beginner CRUD apps skip the part that actually matters in the real world: **how do you let two very different kinds of users touch the same data safely?**

- A human admin logging into a dashboard (session-based, via JWT)
- An external service calling your API on someone else's behalf (API-key-based, scoped to read or read+write)

TaskVault implements both, side by side, so you can see the difference in one codebase.

## Features

- ✅ CRUD task management with status (`pending` / `in_progress` / `done`) and priority
- ✅ Admin dashboard (plain HTML/CSS/JS, no build step) with login, task table, and API key management
- ✅ JWT-based session auth for the dashboard (`/api/*`)
- ✅ API-key-based auth for external consumers (`/api/v1/*`), with **read** and **write** scopes
- ✅ API keys are hashed with bcrypt before storage — the raw key is shown exactly once, at creation
- ✅ Rate limiting (tighter on the public API and on login attempts, to blunt brute-force/abuse)
- ✅ Input validation on every write endpoint (`express-validator`)
- ✅ Security headers via `helmet`
- ✅ SQLite via `better-sqlite3` — a real embedded database, zero setup required
- ✅ Automated tests (`jest` + `supertest`) covering auth, tasks, and the public API's scopes
- ✅ GitHub Actions CI running the test suite on every push/PR

## Architecture

```
┌─────────────────┐        JWT (login session)        ┌──────────────┐
│  Admin Dashboard │ ─────────────────────────────────▶│  /api/*      │
│  (public/*.html) │                                    │  tasks/keys  │
└─────────────────┘                                    └──────┬───────┘
                                                                │
                                                          ┌─────▼──────┐
                                                          │  SQLite DB │
                                                          └─────▲──────┘
                                                                │
┌─────────────────┐      x-api-key (scoped)            ┌──────┴───────┐
│ External Service │ ────────────────────────────────▶ │  /api/v1/*   │
│ (outside people)  │                                   │  public API  │
└─────────────────┘                                    └──────────────┘
```

## Getting started

```bash
git clone <your-fork-url>
cd taskvault
npm install
cp .env.example .env
# open .env and set JWT_SECRET to a long random string:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm start
```

Visit `http://localhost:3000`. Log in with the seeded admin account printed in your console on first run (`SEED_ADMIN_USER` / `SEED_ADMIN_PASSWORD` from `.env`, default `admin` / `ChangeMe123!`) — **change that password immediately.**

Run the tests:

```bash
npm test
```

## Using the public API (for "outside people")

1. Log into the dashboard → **API Keys** tab → **Generate Key**, choose a scope.
2. Copy the key — it's shown once and only its hash is stored.
3. Call the API:

```bash
curl http://localhost:3000/api/v1/tasks \
  -H "x-api-key: tv_your_key_here"
```

Write access (only for keys with `write` scope):

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "x-api-key: tv_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Created by an external service"}'
```

## Project structure

```
taskvault/
├── server.js                # App entry point, middleware wiring
├── src/
│   ├── db/index.js          # SQLite schema + connection
│   ├── middleware/
│   │   ├── auth.js          # JWT (dashboard) + API key (external) guards
│   │   └── rateLimiter.js   # Per-surface rate limits
│   └── routes/
│       ├── auth.js          # POST /api/auth/login
│       ├── tasks.js         # Dashboard CRUD (JWT-protected)
│       ├── apiKeys.js       # Issue/revoke API keys (JWT-protected)
│       └── publicApi.js     # External API (API-key-protected)
├── public/                  # Admin dashboard frontend (no build step)
├── tests/                   # Jest + Supertest suite
└── .github/workflows/ci.yml # CI: runs tests on push/PR
```

## Security notes

This is a learning/portfolio project, not a hardened production system. Before deploying it for real use, at minimum:
- Put it behind HTTPS (a reverse proxy like Caddy/Nginx, or a platform that terminates TLS)
- Change the seeded admin password and rotate `JWT_SECRET`
- Consider a managed Postgres/MySQL instance instead of a local SQLite file if you need multiple app instances
- Add refresh tokens / shorter JWT expiry + a revocation list if session hijacking is a concern for your use case

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get set up, coding conventions, and how to submit a pull request. Good first areas to extend:

- Pagination and filtering on `GET /api/v1/tasks`
- A "regenerate key" action
- Switching the storage layer to Postgres via an interface, for multi-instance deployments
- A dark/light theme toggle on the dashboard

## License

[MIT](./LICENSE)
