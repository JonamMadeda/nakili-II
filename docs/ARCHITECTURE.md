# Architecture

## Directory Structure

```
nakili/
├── .env.example
├── drizzle/                    # Drizzle migrations
│   ├── 0000_worried_hellcat.sql
│   └── meta/
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker (offline caching)
│   └── icons/                  # PWA icons (SVG)
├── scripts/
│   └── reset-data.ts           # Clear all data utility
└── src/
    ├── app/
    │   ├── globals.css          # TailwindCSS v4 @theme + custom CSS
    │   ├── layout.tsx           # Root layout (metadata, fonts, SW registration)
    │   ├── page.tsx             # Home: auth check, sidebar + book editor
    │   ├── auth/page.tsx        # Sign in / Sign up (clean minimal UI)
    │   ├── accounts/page.tsx    # Account management (profile, security, delete)
    │   └── api/
    │       ├── auth/
    │       │   ├── signup/route.ts
    │       │   ├── signin/route.ts
    │       │   └── session/route.ts
    │       ├── books/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── route.ts
    │       │       └── pages/[pageId]/route.ts
    │       └── accounts/
    │           ├── route.ts
    │           ├── password/route.ts
    │           └── delete/route.ts
    ├── components/
    │   ├── ui/
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   └── modal.tsx
    │   ├── sidebar.tsx
    │   ├── book-editor.tsx
    │   ├── rich-text-editor.tsx
    │   └── global-loader.tsx
    ├── db/
    │   ├── schema.ts            # Drizzle schema (users, books, pages)
    │   └── index.ts             # All DB query functions (direct SQL)
    └── lib/
        ├── encryption.ts        # AES-256-GCM encrypt/decrypt
        └── utils.ts             # cn() = clsx wrapper
```

## Component Tree

```
RootLayout
  └── AuthPage (/auth)                    — Sign in / Sign up
  └── AccountsPage (/accounts)            — Profile, security, sign out, delete account
  └── HomePage (/)                        — Main app
      └── GlobalLoaderProvider            — Context for full-screen loading overlay
          ├── Sidebar                     — Book list, search, create, settings btn
          └── Main Content
              ├── [no book] → Empty state
              └── BookEditor              — Book title, page search, pages
                  └── RichTextEditor      — TipTap editor per page
```

## Data Flow

1. **Auth**: User signs in → `POST /api/auth/signin` sets `userId` httpOnly cookie (7-day)
2. **Session check**: Each page load → `GET /api/auth/session` reads cookie, returns user or 401
3. **Books**: Sidebar fetches `GET /api/books` → list of books with page counts
4. **Book detail**: Select book → `GET /api/books/[id]` → full book with all pages (decrypted)
5. **Auto-save**: Edit triggers debounced `PUT /api/books/[id]` after 500ms inactivity
6. **Auth pattern**: Every API route reads `request.cookies.get('userId')?.value` to identify user

## Route Map

| Route | Type | Purpose |
|---|---|---|
| `/` | Page | Main app (sidebar + editor) |
| `/auth` | Page | Login / signup |
| `/accounts` | Page | Account management |
| `/api/auth/signup` | POST | Register |
| `/api/auth/signin` | POST | Login (sets cookie) |
| `/api/auth/session` | GET | Check session |
| `/api/books` | GET/POST | List / create books |
| `/api/books/[id]` | GET/PUT/DELETE | Read / update / delete book |
| `/api/books/[id]/pages/[pageId]` | DELETE | Delete single page |
| `/api/accounts` | GET | Get user profile |
| `/api/accounts/password` | PUT | Change password |
| `/api/accounts/delete` | DELETE | Delete account |
