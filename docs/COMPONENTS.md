# Components

## UI Primitives (`src/components/ui/`)

### Button

Reusable button with variants, sizes, and loading state. Forwards ref.

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

<Button variant="primary" size="md" isLoading={false}>Click me</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="ghost">Cancel</Button>
```

### Input

Styled input with optional label and error message. Auto-generates ID via `useId()`.

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

<Input label="Email" placeholder="you@example.com" error="Invalid email" />
<Input type="password" label="Password" />
```

### Modal

Portal-based modal dialog. Renders into `document.body` via `createPortal`.

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

<Modal isOpen={true} onClose={handleClose} title="Confirm" footer={<Button>OK</Button>}>
  <p>Are you sure?</p>
</Modal>
```

---

## Feature Components

### GlobalLoaderProvider (`global-loader.tsx`)

React Context providing full-screen loading overlay. Wraps the app at the top level.

```tsx
// Provider
<GlobalLoaderProvider>
  {children}
</GlobalLoaderProvider>

// Hook usage
const { isLoading, loadingMessage, setLoading, withLoading } = useLoading();

// withLoading wraps a promise with automatic loading state
await withLoading(fetch('/api/books', { method: 'POST' }), 'Creating book...');
// setLoading for manual control
setLoading(true, 'Saving...');
```

### Sidebar (`sidebar.tsx`)

Left navigation panel. Dark navy theme. Shows books list with search, create button, context menu (Export PDF, Delete), and settings link.

```tsx
interface SidebarProps {
  isOpen: boolean;                          // Mobile overlay toggle
  onClose: () => void;                      // Close mobile sidebar
  selectedBookId: string | null;            // Currently selected
  onSelectBook: (id: string) => void;       // Select a book
  onDeleteBook: (id: string) => void;       // Book was deleted
  onExportBook: (id: string) => void;       // Export book PDF (sets it as selected in BookEditor)
  onOpenSettings: () => void;               // Navigate to /settings
  onBookCreated: (bookId: string) => void;   // New book created, select it
}
```

- Fetches `GET /api/books` on mount
- Search filters by title locally
- Context menu appears on `MoreVertical` click, positioned via `getBoundingClientRect`
- Closes on outside click (mousedown listener)

### BookEditor (`book-editor.tsx`)

Main editing interface for a single book. Shows book title, page search, and all pages in reverse chronological order.

```tsx
interface BookEditorProps {
  bookId: string;
  onBack?: () => void;   // Mobile back button
}
```

- Fetches `GET /api/books/[bookId]` when `bookId` changes
- Auto-saves via debounced (500ms) `PUT /api/books/[bookId]`
- **Limits**: 3000 words/page (strict — edits over limit rejected), 100 pages/book
- Page card: `max-h-[650px]` with fixed header and toolbar, only content scrolls
- Page context menu: Export PDF (single page), Delete
- Full-book PDF export via jsPDF
- PDF rendering: parses TipTap HTML with DOMParser, renders headings/lists/quotes/code blocks

### RichTextEditor (`rich-text-editor.tsx`)

TipTap editor wrapper with toolbar.

```tsx
interface RichTextEditorProps {
  content: string;            // Initial HTML content
  onChange: (content: string) => void;  // Called on every edit (getHTML())
  placeholder?: string;       // Default: "Start writing..."
  className?: string;         // Added to container
}
```

- Extensions: StarterKit (h1-h3, bold, italic, strike, bullet list, ordered list) + Placeholder
- Toolbar buttons: Bold, Italic, Strike, H1/H2/H3, Bullet List, Ordered List
- Toolbar is `flex-shrink-0` (always visible), content area scrolls independently
- Outer wrapper uses `flex flex-col min-h-0` to flex-fill in parent containers
- Includes global `<style>` for ProseMirror typography
- Editor instance is internal; parent gets content via `onChange(editor.getHTML())`
