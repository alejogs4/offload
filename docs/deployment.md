# Deployment Guide for Offload

This guide explains how to deploy **Offload** using **Turso (Cloud SQLite via LibSQL)** and **Vercel** (or any serverless / container runtime).

---

## Architecture Overview

- **Framework**: React Router v7 (SSR / Framework Mode with Vite)
- **Database Driver**: `@libsql/client` (Connects seamlessly to Cloud Turso via HTTP/WebSockets or local SQLite `file:sqlite.db`)
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth (Multi-tenant OAuth via GitHub & Google, session cookies, database tenant isolation)
- **AI Categorization**: Vercel AI SDK (Google Gemini / OpenAI / Heuristic fallback)
- **Telemetry**: Server-Timing headers and execution profiling decorators

---

## 100% Free Deployment: Turso + Vercel

### Step 1: Create your Free Turso Database

1. Install Turso CLI:
   ```bash
   brew install tursodatabase/tap/turso
   ```
2. Authenticate:
   ```bash
   turso auth signup # or turso auth login
   ```
3. Create database:
   ```bash
   turso db create offload-db
   ```
4. Retrieve connection credentials:
   ```bash
   turso db show offload-db --url
   # Output: libsql://offload-db-[username].turso.io

   turso db tokens create offload-db
   # Output: JWT auth token
   ```

---

### Step 2: Push Database Schema to Turso

Apply the Drizzle schema to your remote Turso instance:

```bash
TURSO_DATABASE_URL="libsql://offload-db-[username].turso.io" \
TURSO_AUTH_TOKEN="your-token" \
npm run db:push
```

---

### Step 3: Deploy to Vercel

1. Push your repository to GitHub.
2. In Vercel, import your repository: **[vercel.com/new](https://vercel.com/new)**.
3. Verify `.npmrc` is present in the repository root containing `legacy-peer-deps=true` (required for clean peer-dependency resolution between Better Auth and Drizzle).
4. Configure the following **Environment Variables** in Vercel Project Settings:

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `TURSO_DATABASE_URL` | **Yes** | Turso database URL | `libsql://offload-db-name.turso.io` |
| `TURSO_AUTH_TOKEN` | **Yes** | Turso authorization token | `eyJhbGci...` |
| `BETTER_AUTH_SECRET` | **Yes** | 32+ char secret for signing auth tokens | Generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | **Yes** | Public production URL | `https://your-domain.vercel.app` |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth App client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth App client secret | `94e8a...` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 client ID | `123...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Optional | Google OAuth 2.0 client secret | `GOCSPX-...` |
| `ADMIN_EMAIL` | Optional | Designated admin email for backoffice | `admin@example.com` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for categorization | `AIzaSy...` |
| `OPENAI_API_KEY` | Optional | OpenAI API key for categorization | `sk-proj-...` |
| `AI_PROVIDER` | Optional | AI provider (`auto` \| `google` \| `openai`) | `auto` |

5. Deploy!

---

## Alternative: Fly.io / Container Deployment

For persistent volume single-node deployments:

1. Create persistent storage: `fly volumes create sqlite_data --size 1`
2. Configure `DATABASE_URL="file:/data/sqlite.db"`
3. Provide secrets via `fly secrets set` (matching the environment variables above).
