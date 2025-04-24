import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CONFIG } from '../../../../config/auth.config';

// Force dynamic since this route uses cookies
export const dynamic = 'force-dynamic';

// Support OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Support HEAD requests for connection testing
export async function HEAD() {
  console.log('Logout API: HEAD request received (connectivity test)');
  return new NextResponse(null, { status: 200 });
}

export async function POST() {
  try {
    // 获取cookie存储
    const cookieStore = cookies();
    
    // 尝试删除cookie
    cookieStore.delete(AUTH_CONFIG.COOKIE_NAME);
    
    // 通过设置过期时间来确保cookie失效
    cookieStore.set({
      name: AUTH_CONFIG.COOKIE_NAME,
      value: '',
      expires: new Date(0),
      path: '/',
    });
    
    // 简单返回成功
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
} 