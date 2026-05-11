# Nakili - Multi-Page Note-Taking Application

A secure, multi-page note-taking Progressive Web App (PWA) with end-to-end encryption.

## Features

- **Multi-page notes**: Create books with multiple pages
- **Rich text editing**: Bold, italic, headings, lists using TipTap
- **Search**: Real-time search across notes and pages
- **PDF export**: Export entire notes to PDF
- **End-to-end encryption**: All content encrypted server-side
- **PWA support**: Install as a native app on mobile devices
- **Offline capability**: Works without internet connection

## Tech Stack

- Next.js 15+ (App Router)
- TypeScript
- TailwindCSS v4
- Neon PostgreSQL
- TipTap Editor
- jsPDF

## Getting Started

### Prerequisites

- Node.js 18+
- Neon PostgreSQL account (https://neon.tech)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and configure:
   ```bash
   cp .env.local.example .env.local
   ```

4. Fill in your configuration in `.env.local`:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `NEON_AUTH_URL`: Your Neon Auth URL (optional, for OAuth)
   - `ENCRYPTION_KEY`: A 32-byte base64 encoded key

5. Generate an encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

6. Push database schema:
   ```bash
   npm run db:push
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema to database
- `npm run db:generate` - Generate Drizzle migrations

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── accounts/       # Account management API
│   │   ├── auth/           # Authentication API
│   │   └── notes/          # Notes CRUD API
│   ├── auth/               # Authentication page
│   ├── settings/          # Account settings page
│   └── page.tsx            # Main application page
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── sidebar.tsx         # Sidebar component
│   ├── book-editor.tsx     # Book editor component
│   └── rich-text-editor.tsx # TipTap editor
├── db/
│   ├── schema.ts           # Database schema
│   └── index.ts            # Database connection
└── lib/
    ├── auth/               # Authentication functions
    ├── encryption.ts       # AES-256-GCM encryption
    └── utils.ts           # Utility functions
```

## License

MIT
