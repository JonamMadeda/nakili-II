import { neon } from '@neondatabase/serverless';
import { eq, asc, desc } from 'drizzle-orm';
import { notes, pages, users } from './schema';

type NeonSql = ReturnType<typeof neon>;

interface DbNote {
  id: string;
  user_id: string;
  title: string;
  last_modified: Date;
  created_at: Date;
}

interface DbPage {
  id: string;
  note_id: string;
  title: string;
  content: string;
  date: Date;
  created_at: Date;
}

async function getSql(): Promise<NeonSql> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }
  return neon(process.env.DATABASE_URL);
}

export async function getAllNotes(userId: string) {
  const sql = await getSql();
  
  const userNotes = await sql`
    SELECT * FROM notes 
    WHERE user_id = ${userId}
    ORDER BY last_modified DESC
  ` as DbNote[];
  
  const decryptedNotes = await Promise.all(
    userNotes.map(async (note) => {
      const notePages = await sql`
        SELECT * FROM pages 
        WHERE note_id = ${note.id}
        ORDER BY created_at ASC
      ` as DbPage[];
      
      const { decrypt } = await import('@/lib/encryption');
      
      return {
        id: note.id,
        title: decrypt(note.title),
        lastModified: note.last_modified,
        createdAt: note.created_at,
        pageCount: notePages.length,
        preview: notePages.length > 0 ? decrypt(notePages[0].content).substring(0, 100) : '',
      };
    })
  );
  
  return decryptedNotes;
}

export async function getNoteById(noteId: string, userId: string) {
  const sql = await getSql();
  const { decrypt } = await import('@/lib/encryption');
  
  const noteResult = await sql`
    SELECT * FROM notes 
    WHERE id = ${noteId} AND user_id = ${userId}
    LIMIT 1
  ` as DbNote[];
  
  if (noteResult.length === 0) {
    return null;
  }
  
  const notePages = await sql`
    SELECT * FROM pages 
    WHERE note_id = ${noteId}
    ORDER BY created_at ASC
  ` as DbPage[];
  
  return {
    id: noteResult[0].id,
    title: decrypt(noteResult[0].title),
    lastModified: noteResult[0].last_modified,
    createdAt: noteResult[0].created_at,
    pages: notePages.map((page) => ({
      id: page.id,
      title: decrypt(page.title),
      content: decrypt(page.content),
      date: page.date,
      createdAt: page.created_at,
    })),
  };
}

export async function createNote(userId: string) {
  const sql = await getSql();
  const { encrypt } = await import('@/lib/encryption');
  const { v4: uuidv4 } = await import('uuid');
  
  const noteId = uuidv4();
  const pageId = uuidv4();
  const now = new Date();
  
  await sql`
    INSERT INTO notes (id, user_id, title, last_modified, created_at)
    VALUES (${noteId}, ${userId}, ${encrypt('Untitled Note')}, ${now}, ${now})
  `;
  
  await sql`
    INSERT INTO pages (id, note_id, title, content, date, created_at)
    VALUES (${pageId}, ${noteId}, ${encrypt('Page 1')}, ${encrypt('')}, ${now}, ${now})
  `;
  
  return {
    id: noteId,
    title: 'Untitled Note',
    lastModified: now,
    createdAt: now,
    pageCount: 1,
    preview: '',
  };
}

export async function updateNote(noteId: string, userId: string, title?: string, updatedPages?: Array<{ id?: string; title: string; content: string }>) {
  const sql = await getSql();
  const { encrypt } = await import('@/lib/encryption');
  
  const noteResult = await sql`SELECT user_id FROM notes WHERE id = ${noteId} LIMIT 1` as { user_id: string }[];
  if (noteResult.length === 0 || noteResult[0].user_id !== userId) {
    return { success: false, error: 'Note not found' };
  }
  
  if (title !== undefined) {
    await sql`UPDATE notes SET title = ${encrypt(title)}, last_modified = ${new Date()} WHERE id = ${noteId}`;
  }
  
  if (updatedPages && Array.isArray(updatedPages)) {
    for (const page of updatedPages) {
      if (page.id) {
        await sql`UPDATE pages SET title = ${encrypt(page.title)}, content = ${encrypt(page.content)}, date = ${new Date()} WHERE id = ${page.id}`;
      } else {
        const { v4: uuidv4 } = await import('uuid');
        const pageId = uuidv4();
        const now = new Date();
        await sql`INSERT INTO pages (id, note_id, title, content, date, created_at) VALUES (${pageId}, ${noteId}, ${encrypt(page.title || 'Untitled Page')}, ${encrypt(page.content || '')}, ${now}, ${now})`;
        await sql`UPDATE notes SET last_modified = ${now} WHERE id = ${noteId}`;
      }
    }
  }
  
  return { success: true };
}

export async function deleteNote(noteId: string, userId: string) {
  const sql = await getSql();
  
  const noteResult = await sql`SELECT user_id FROM notes WHERE id = ${noteId} LIMIT 1` as { user_id: string }[];
  if (noteResult.length === 0 || noteResult[0].user_id !== userId) {
    return { success: false, error: 'Note not found' };
  }
  
  await sql`DELETE FROM pages WHERE note_id = ${noteId}`;
  await sql`DELETE FROM notes WHERE id = ${noteId}`;
  
  return { success: true };
}

export async function deletePage(noteId: string, pageId: string, userId: string) {
  const sql = await getSql();
  
  const noteResult = await sql`SELECT user_id FROM notes WHERE id = ${noteId} LIMIT 1` as { user_id: string }[];
  if (noteResult.length === 0 || noteResult[0].user_id !== userId) {
    return { success: false, error: 'Note not found' };
  }
  
  const pageCount = await sql`SELECT COUNT(*) as count FROM pages WHERE note_id = ${noteId}` as { count: number }[];
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
  const { v4: uuidv4 } = await import('uuid');
  
  await sql`INSERT INTO users (id, email, password_hash, created_at) VALUES (${uuidv4()}, ${email}, ${passwordHash}, NOW())`;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const sql = await getSql();
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function deleteUserAccount(userId: string) {
  const sql = await getSql();
  await sql`DELETE FROM notes WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
}
