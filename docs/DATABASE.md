# Database

## Schema (`src/db/schema.ts`)

PostgreSQL via Neon. Drizzle ORM used only for schema definitions and migrations — all queries are direct SQL.

### Tables

```sql
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
)

books (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,              -- references users.id
  title         TEXT NOT NULL,              -- encrypted
  last_modified TIMESTAMP DEFAULT NOW(),
  created_at    TIMESTAMP DEFAULT NOW()
)

pages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,                  -- encrypted
  content    TEXT NOT NULL,                  -- encrypted (TipTap HTML)
  date       TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Types

```typescript
User  = { id, email, passwordHash, createdAt }
Book  = { id, userId, title, lastModified, createdAt }
Page  = { id, bookId, title, content, date, createdAt }
New*  = Insert types for each
```

## Encryption (`src/lib/encryption.ts`)

- **Algorithm**: AES-256-GCM
- **Key derivation**: `crypto.scryptSync(key, 'salt', 32)` from `ENCRYPTION_KEY` env var
- **IV**: 16 random bytes per encryption
- **Auth tag**: 16 bytes (GCM)
- **Storage format**: `base64(iv + authTag + ciphertext)`
- **Decrypt fallback**: If decryption fails (e.g., legacy unencrypted data), returns raw text

Used before any DB write for `books.title`, `pages.title`, `pages.content`.
Decrypted on read in `getAllBooks()` and `getBookById()`.

## Query Functions (`src/db/index.ts`)

All functions use `@neondatabase/serverless` tagged template literal SQL (not Drizzle query builder).

| Function | Purpose |
|---|---|
| `getAllBooks(userId)` | All books for user (decrypted title, page counts via N+1) |
| `getBookById(bookId, userId)` | Single book + all pages (decrypted) |
| `createBook(userId)` | New book + one empty page, UUIDs generated server-side |
| `updateBook(bookId, userId, title?, pages?)` | Update title + upsert pages |
| `deleteBook(bookId, userId)` | Delete book + pages (verifies ownership) |
| `deletePage(bookId, pageId, userId)` | Delete single page (cannot delete last) |
| `getUserById(userId)` | Get user by ID |
| `getUserByEmail(email)` | Get user by email (includes password_hash) |
| `createUser(email, passwordHash)` | Insert new user |
| `updateUserPassword(userId, passwordHash)` | Update password_hash |
| `deleteUserAccount(userId)` | Delete all user's books then user |

**Important**: `getUserByEmail` returns `password_hash` — be careful not to expose it in API responses.

## Known Issues

- `getAllBooks` uses N+1 pattern (separate query per book for page count)
- `scripts/reset-data.ts` has a typo: `notes` table referenced instead of `books`
- `drizzle.config.ts` has hardcoded DB URL instead of env var
