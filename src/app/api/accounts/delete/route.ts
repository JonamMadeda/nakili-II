import { NextRequest, NextResponse } from 'next/server';
import { deleteUserAccount } from '@/db';

function getUserId(request: NextRequest): string | null {
  return request.cookies.get('userId')?.value || null;
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteUserAccount(userId);

    const response = NextResponse.json({ success: true });
    response.cookies.delete('userId');

    return response;
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
