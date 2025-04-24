import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '../../../../config/auth.config';

// Force dynamic since this route uses cookies
export const dynamic = 'force-dynamic';

export async function POST() {
  // Clear the auth token cookie
  cookies().delete(AUTH_CONFIG.COOKIE_NAME);
  
  return NextResponse.json({ success: true });
} 