import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser } from '@/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existingUsers = await getUserByEmail(email);
    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await createUser(email, hashedPassword);

    const newUsers = await getUserByEmail(email);
    if (newUsers.length === 0) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const user = newUsers[0];
    return NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        created_at: user.created_at 
      } 
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
