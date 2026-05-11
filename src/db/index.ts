import { neon } from '@neondatabase/serverless';
import { encrypt, decrypt } from '@/lib/encryption';
import { v4 as uuidv4 } from 'uuid';

type NeonSql = ReturnType<typeof neon>;

interface DbBook {
  id: string;
  user_id: string;
  title: string;
  last_modified: Date;
  created_at: Date;
}

interface DbPage {
  id: string;
  book_id: string;
  title: string;
  content: string;
  date: Date;
  created_at: Date;
}

let sqlConnection: NeonSql | null = null;

async function getSql(): Promise<NeonSql> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }
  sqlConnection = neon(process.env.DATABASE_URL);
  return sqlConnection;
}

export async function getAllBooks(userId: string) {
  const sql = await getSql();
  
  const userBooks = await sql`
    SELECT id, title, last_modified, created_at FROM books 
    WHERE user_id = ${userId}
    ORDER BY last_modified DESC
  ` as DbBook[];
  
  if (userBooks.length === 0) {
    return [];
  }

  const allPages: { id: string; book_id: string; created_at: Date }[] = [];
  for (const book of userBooks) {
    const pages = await sql`
      SELECT id, book_id, created_at FROM pages 
      WHERE book_id = ${book.id}
      ORDER BY created_at ASC
    ` as { id: string; book_id: string; created_at: Date }[];
    allPages.push(...pages);
  }

  const pageCountMap = new Map<string, number>();
  for (const page of allPages) {
    const count = pageCountMap.get(page.book_id) || 0;
    pageCountMap.set(page.book_id, count + 1);
  }

  return userBooks.map(book => ({
    id: book.id,
    title: decrypt(book.title),
    lastModified: book.last_modified,
    createdAt: book.created_at,
    pageCount: pageCountMap.get(book.id) || 0,
    preview: '',
  }));
}

export async function getBookById(bookId: string, userId: string) {
  const sql = await getSql();
  
  const [bookResult, bookPages] = await Promise.all([
    sql`SELECT id, title, last_modified, created_at FROM books WHERE id = ${bookId} AND user_id = ${userId} LIMIT 1`,
    sql`SELECT id, title, content, date, created_at FROM pages WHERE book_id = ${bookId} ORDER BY created_at ASC`
  ]) as unknown as [DbBook[], DbPage[]];
  
  if (bookResult.length === 0) {
    return null;
  }
  
  return {
    id: bookResult[0].id,
    title: decrypt(bookResult[0].title),
    lastModified: bookResult[0].last_modified,
    createdAt: bookResult[0].created_at,
    pages: bookPages.map(page => ({
      id: page.id,
      title: decrypt(page.title),
      content: decrypt(page.content),
      date: page.date,
      createdAt: page.created_at,
    })),
  };
}

export async function createBook(userId: string) {
  const sql = await getSql();
  const bookId = uuidv4();
  const pageId = uuidv4();
  const now = new Date();
  
  await sql`
    INSERT INTO books (id, user_id, title, last_modified, created_at)
    VALUES (${bookId}, ${userId}, ${encrypt('Untitled Book')}, ${now}, ${now})
  `;
  
  await sql`
    INSERT INTO pages (id, book_id, title, content, date, created_at)
    VALUES (${pageId}, ${bookId}, ${encrypt('Page 1')}, ${encrypt('')}, ${now}, ${now})
  `;
  
  return {
    id: bookId,
    title: 'Untitled Book',
    lastModified: now,
    createdAt: now,
    pageCount: 1,
    preview: '',
  };
}

export async function updateBook(bookId: string, userId: string, title?: string, updatedPages?: Array<{ id?: string; title: string; content: string }>) {
  const sql = await getSql();
  
  const bookResult = await sql`SELECT user_id FROM books WHERE id = ${bookId} LIMIT 1` as { user_id: string }[];
  if (bookResult.length === 0 || bookResult[0].user_id !== userId) {
    return { success: false, error: 'Book not found' };
  }
  
  if (title !== undefined) {
    await sql`UPDATE books SET title = ${encrypt(title)}, last_modified = ${new Date()} WHERE id = ${bookId}`;
  }
  
  if (updatedPages && Array.isArray(updatedPages)) {
    for (const page of updatedPages) {
      if (page.id) {
        await sql`UPDATE pages SET title = ${encrypt(page.title)}, content = ${encrypt(page.content)}, date = ${new Date()} WHERE id = ${page.id}`;
      } else {
        const pageId = uuidv4();
        const now = new Date();
        await sql`INSERT INTO pages (id, book_id, title, content, date, created_at) VALUES (${pageId}, ${bookId}, ${encrypt(page.title || 'Untitled Page')}, ${encrypt(page.content || '')}, ${now}, ${now})`;
        await sql`UPDATE books SET last_modified = ${now} WHERE id = ${bookId}`;
      }
    }
  }
  
  return { success: true };
}

export async function deleteBook(bookId: string, userId: string) {
  const sql = await getSql();
  
  const bookResult = await sql`SELECT user_id FROM books WHERE id = ${bookId} LIMIT 1` as { user_id: string }[];
  if (bookResult.length === 0 || bookResult[0].user_id !== userId) {
    return { success: false, error: 'Book not found' };
  }
  
  await sql`DELETE FROM pages WHERE book_id = ${bookId}`;
  await sql`DELETE FROM books WHERE id = ${bookId}`;
  
  return { success: true };
}

export async function deletePage(bookId: string, pageId: string, userId: string) {
  const sql = await getSql();
  
  const bookResult = await sql`SELECT user_id FROM books WHERE id = ${bookId} LIMIT 1` as { user_id: string }[];
  if (bookResult.length === 0 || bookResult[0].user_id !== userId) {
    return { success: false, error: 'Book not found' };
  }
  
  const pageCount = await sql`SELECT COUNT(*) as count FROM pages WHERE book_id = ${bookId}` as { count: number }[];
  if (pageCount[0].count <= 1) {
    return { success: false, error: 'Cannot delete the last page' };
  }
  
  await sql`DELETE FROM pages WHERE id = ${pageId}`;
  
  return { success: true };
}

export async function getUserById(userId: string) {
  const sql = await getSql();
  return await sql`SELECT id, email, created_at FROM users WHERE id = ${userId} LIMIT 1` as { id: string; email: string; created_at: Date }[];
}

export async function getUserByEmail(email: string) {
  const sql = await getSql();
  return await sql`SELECT id, email, password_hash, created_at FROM users WHERE email = ${email} LIMIT 1` as { id: string; email: string; password_hash: string; created_at: Date }[];
}

export async function createUser(email: string, passwordHash: string) {
  const sql = await getSql();
  await sql`INSERT INTO users (id, email, password_hash, created_at) VALUES (${uuidv4()}, ${email}, ${passwordHash}, NOW())`;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const sql = await getSql();
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function deleteUserAccount(userId: string) {
  const sql = await getSql();
  await sql`DELETE FROM books WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
}
