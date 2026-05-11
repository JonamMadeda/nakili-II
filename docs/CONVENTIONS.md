# Conventions

## Naming

| Category | Convention | Examples |
|---|---|---|
| Files | kebab-case | `book-editor.tsx`, `rich-text-editor.tsx` |
| Components | PascalCase | `BookEditor`, `RichTextEditor` |
| Functions/vars | camelCase | `fetchBooks`, `debouncedSave` |
| API route files | `route.ts` inside dir | `src/app/api/books/[id]/route.ts` |
| DB columns | snake_case | `user_id`, `password_hash` |
| CSS classes | kebab-case with sidebar prefix | `.sidebar-item`, `.book-icon` |

## Imports order

1. React / Next.js
2. Third-party libs (lucide-react, jspdf, etc.)
3. Internal components (`@/components/...`)
4. Internal libs (`@/lib/utils`, `@/db`, `@/lib/encryption`)

## Coding Patterns

- **All pages**: `'use client'` directive at top
- **State**: Local `useState` only (no Redux/Zustand)
- **Data fetching**: `useEffect` + `fetch` + `useState` (no React Query/SWR)
- **Context**: Only for `GlobalLoaderProvider` (loading overlay)
- **Auto-save**: `useRef` for timeout ID, `useCallback` for save fn, `useEffect` cleanup
- **PDF export**: Client-side only via jsPDF + DOMParser HTML parsing
- **Encryption**: Server-side only in `src/db/index.ts` — titles/content encrypted before write, decrypted on read
- **Auth**: Cookie-based (`userId` httpOnly cookie) — read via `request.cookies.get('userId')?.value`
- **Error handling**: try/catch with `console.error` + user-facing error state
- **Modals**: `createPortal` to `document.body`

## Styling

- **Framework**: TailwindCSS v4 via `@tailwindcss/postcss`
- **Custom theme**: In `globals.css` using `@theme {}` directive
- **Sidebar theme**: Gray/slate palette based on `--color-secondary: #1F2937`, using classes (`.sidebar`, `.sidebar-text`, `.sidebar-item`, etc.). No glow effects, minimal borders.
- **Animations**: `animate-fade-in` and `animate-scale-in` (200ms ease-out) for modals/overlays
- **Conditional classes**: `cn()` utility (clsx wrapper)
- **Breakpoints**: `lg:` (1024px) for sidebar responsive behavior
- **Font**: Inter (Google Fonts), weights 400/500/600/700

## State Management Rules

| State Type | Mechanism |
|---|---|
| Component-local | `useState` |
| Global loading | React Context (`GlobalLoaderProvider`) |
| Debounce timeouts | `useRef` |
| Memoized callbacks | `useCallback` |
| Navigation | `useRouter` from Next.js |
| URLs/params | `useRouter` + `useParams` + `useSearchParams` |

## Known Issues / Gotchas

1. **`PUT /api/accounts/password`** references `body.email` but client doesn't send it; the user lookup works because it also uses the cookie's userId
2. **`scripts/reset-data.ts`** has `DELETE FROM notes` — should be `DELETE FROM books`
3. **`drizzle.config.ts`** has hardcoded DB URL instead of reading from env
4. **No input sanitization** — TipTap HTML content stored as-is
5. **No rate limiting** on auth endpoints
6. **Encryption key derivation** uses static salt `'salt'` in scryptSync
7. **`getAllBooks`** uses N+1 query pattern for page counts
8. **No tests** — no test framework or test files exist
