import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/db';

function getUserId(request: NextRequest): string | null {
  return request.cookies.get('userId')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getUserById(userId);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: users[0].id,
        email: users[0].email,
        createdAt: users[0].created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
