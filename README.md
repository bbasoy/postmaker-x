# PostMaker X

> Optimize your X (Twitter) posts for maximum engagement using algorithm-backed analysis and AI-powered suggestions.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?logo=pnpm)](https://pnpm.io/)

## Features

- **Post Analyzer** - Score your posts against X's algorithm signals
- **AI Suggestions** - Get improvement tips powered by Gemini AI
- **Thread Creator** - Build engaging multi-post threads
- **Timing Optimizer** - Find the best times to post
- **Template Library** - Quick-start with proven post formats

## Tech Stack

| Frontend | Backend | Shared |
|----------|---------|--------|
| React 18 | Express | TypeScript |
| Vite | Drizzle ORM | Zod |
| TailwindCSS | PostgreSQL | - |
| Zustand | Gemini AI | - |
| React Query | - | - |

## Quick Start

```bash
# Clone
git clone https://github.com/byigitt/postmaker-x.git
cd postmaker-x

# Install
pnpm install

# Setup env (API)
cp apps/api/.env.example apps/api/.env
# Add your DATABASE_URL and GEMINI_API_KEY

# Push database schema
pnpm db:push

# Run dev
pnpm dev
```

**Web**: http://localhost:5173
**API**: http://localhost:3001

## Project Structure

```
postmaker-x/
├── apps/
│   ├── web/        # React frontend
│   └── api/        # Express backend
└── packages/
    └── shared/     # Types & algorithm weights
```

## Scripts

```bash
pnpm dev          # Start all apps
pnpm build        # Build everything
pnpm tc           # Typecheck all
pnpm db:studio    # Open Drizzle Studio
```

## License

MIT
