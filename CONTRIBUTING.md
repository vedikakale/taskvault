# Contributing to TaskVault

Thanks for considering a contribution! This is a small, friendly codebase — great for a first open-source PR.

## Setup

```bash
git clone <your-fork-url>
cd taskvault
npm install
cp .env.example .env   # then set JWT_SECRET
npm run dev            # starts with nodemon (auto-restart)
```

## Before opening a PR

1. **Run the tests**: `npm test` — please add tests for any new behavior.
2. **Keep endpoints consistent**: dashboard routes under `/api/*` use `requireJwt`; anything meant for external consumers goes under `/api/v1/*` and uses `requireApiKey`.
3. **Validate input** on any new write endpoint using `express-validator`, matching the existing style in `src/routes/`.
4. **Don't log secrets** — never `console.log` a raw API key, password, or JWT.
5. Keep pull requests focused: one feature or fix per PR is easier to review than several bundled together.

## Commit messages

Plain, descriptive messages are fine, e.g. `Add pagination to GET /api/v1/tasks`. Conventional Commits (`feat:`, `fix:`, `docs:`) are welcome but not required.

## Reporting bugs / suggesting features

Please open an issue using the templates under `.github/ISSUE_TEMPLATE/` — they ask for just enough detail to act on the report quickly.

## Code of conduct

Be respectful and constructive. This project is a learning space for contributors of all experience levels.
