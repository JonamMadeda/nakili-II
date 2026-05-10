import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value;
  
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  
  const result = await sql`SELECT id, email, created_at FROM users WHERE id = ${userId} LIMIT 1`;
  
  if (result.length === 0) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ 
    user: { 
      id: result[0].id, 
      email: result[0].email, 
      created_at: result[0].created_at 
    } 
  });
}
