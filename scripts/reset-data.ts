import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function reset() {
  await sql`DELETE FROM pages`;
  await sql`DELETE FROM notes`;
  console.log('Cleared all notes and pages');
}

reset().catch(console.error);