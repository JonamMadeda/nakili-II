# API Reference

All routes live under `src/app/api/`. Auth via httpOnly `userId` cookie set on signin.

---

## Auth

### `POST /api/auth/signup`

Register a new user.

```json
// Request
{ "email": "user@example.com", "password": "min6chars" }
// Response 200
{ "user": { "id": "uuid", "email": "...", "created_at": "..." } }
// Response 400
{ "error": "Email already registered" }
// Response 400
{ "error": "Password must be at least 6 characters" }
```

### `POST /api/auth/signin`

Authenticate and set `userId` cookie (7-day, httpOnly, sameSite lax, secure in prod).

```json
// Request
{ "email": "user@example.com", "password": "..." }
// Response 200
{ "user": { "id": "uuid", "email": "...", "created_at": "..." } }
// Response 401
{ "error": "Invalid email or password" }
```

### `GET /api/auth/session`

Check current session.

```json
// Response 200 (authenticated)
{ "user": { "id": "uuid", "email": "...", "created_at": "..." } }
// Response 401
{ "user": null }
```

---

## Books

### `GET /api/books`

List all books for current user (title decrypted, with page count).

```json
// Response 200
{ "books": [{ "id": "uuid", "title": "...", "lastModified": "...", "createdAt": "...", "pageCount": 3, "preview": "" }] }
```

### `POST /api/books`

Create a new book with one initial empty page.

```json
// Response 200
{ "book": { "id": "uuid", "title": "Untitled Book", "lastModified": "...", "createdAt": "...", "pageCount": 1, "preview": "" } }
```

### `GET /api/books/[id]`

Get a single book with all its pages (titles and content decrypted).

```json
// Response 200
{
  "id": "uuid",
  "title": "...",
  "lastModified": "...",
  "createdAt": "...",
  "pages": [
    { "id": "uuid", "title": "...", "content": "<p>HTML from TipTap</p>", "date": "...", "createdAt": "..." }
  ]
}
// Response 404
{ "error": "Book not found" }
```

### `PUT /api/books/[id]`

Update book title and/or pages. Pages with `id` are updated, without `id` are inserted.

```json
// Request
{ "title": "New Title", "pages": [{ "id": "existing-uuid", "title": "...", "content": "..." }, { "title": "New Page", "content": "" }] }
// Response 200
{ "success": true }
```

### `DELETE /api/books/[id]`

Delete a book and all its pages.

```json
// Response 200
{ "success": true }
```

### `DELETE /api/books/[id]/pages/[pageId]`

Delete a single page. Cannot delete the last page.

```json
// Response 200
{ "success": true }
// Response 400
{ "error": "Cannot delete the last page" }
```

---

## Accounts

### `GET /api/accounts`

Get current user profile.

```json
// Response 200
{ "user": { "id": "uuid", "email": "...", "createdAt": "..." } }
```

### `PUT /api/accounts/password`

Change password (requires current password).

```json
// Request
{ "currentPassword": "...", "newPassword": "..." }
// Response 200
{ "success": true }
// Response 400
{ "error": "Current password is incorrect" }
```

**Known bug**: The server also reads `body.email` but client doesn't send it. The lookup works because it reads the cookie to get userId directly.

### `DELETE /api/accounts/delete`

Delete account and all associated books (cascade). Clears cookie.

```json
// Response 200
{ "success": true }
```
