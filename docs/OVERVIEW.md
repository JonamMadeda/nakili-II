# Nakili - Overview

Secure, multi-page note-taking PWA with end-to-end encryption. Users create "books" (notebooks) containing rich-text pages.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TypeScript 5.6 (strict) |
| Styling | TailwindCSS v4 (`@tailwindcss/postcss`) |
| Rich Text | TipTap 2.6 (ProseMirror) |
| Database | Neon PostgreSQL (`@neondatabase/serverless`, direct SQL) |
| ORM | Drizzle ORM (schema + migrations only, not used for queries) |
| Auth | Cookie-based (`userId` httpOnly cookie, bcryptjs) |
| Encryption | AES-256-GCM (Node `crypto`) |
| PDF | jsPDF (client-side) |
| Icons | Lucide React |
| PWA | `manifest.json` + `sw.js` (offline caching) |

## Quick Start

```
npm install
# Set up .env.local with DATABASE_URL and ENCRYPTION_KEY
npm run db:push     # Push schema to Neon
npm run dev         # Start dev server on localhost:3000
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ENCRYPTION_KEY` | Key material for AES-256-GCM (any length, scrypt-derived to 32 bytes) |

## Key Design Decisions

- **All pages are `'use client'`** — no React Server Components
- **Direct SQL via tagged template literals** — Drizzle ORM only for schema/migrations
- **Encryption at rest** — titles and content encrypted before DB insert, decrypted on read
- **Cookie auth** — simple `userId` cookie, no JWT/OAuth
- **Auto-save** — 500ms debounce on any change
- **Limits** — 3000 words/page, 1000 pages/book (client-side warnings)
- **Pages** — `/` (app), `/auth` (sign in/up), `/accounts` (profile & security)
- **Sidebar** — dark navy (`#00001A`), responsive (overlay on mobile, fixed on desktop)
