import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';

// Tell Next.js this route should be dynamic since it uses cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = verifyAuth(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Dummy user profile data
  // In a real app, this would fetch from a database
  const userProfile = {
    username: user.username,
    name: user.username === 'admin' ? 'Admin User' : 'Regular User',
    email: `${user.username}@example.com`,
    role: user.username === 'admin' ? 'administrator' : 'user'
  };
  
  return NextResponse.json({ user: userProfile });
} 