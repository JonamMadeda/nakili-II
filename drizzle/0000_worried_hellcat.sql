-- Rename table notes -> books (preserves all data)
ALTER TABLE notes RENAME TO books;

-- Drop the old FK constraint that referenced notes.id
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_note_id_notes_id_fk;

-- Rename the column note_id -> book_id in pages
ALTER TABLE pages RENAME COLUMN note_id TO book_id;

-- Re-add the FK constraint referencing books.id
ALTER TABLE pages ADD CONSTRAINT pages_book_id_books_id_fk 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
