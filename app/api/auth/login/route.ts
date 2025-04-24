import { NextRequest, NextResponse } from 'next/server';
import { sign, SignOptions } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { AUTH_CONFIG, USERS } from '../../../../config/auth.config';

// Force dynamic since this route uses cookies
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 检查是否有配置用户
    if (USERS.length === 0) {
      console.error('No valid users configured. Check environment variables.');
      return NextResponse.json(
        { error: '系统配置错误: 未设置有效用户' },
        { status: 500 }
      );
    }

    const { username, password } = await request.json();
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Find user (in a real app, this would query a database)
    const user = USERS.find(
      (u) => u.username === username && u.password === password
    );
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
    // Create JWT token with proper typing
    const signOptions: SignOptions = { expiresIn: AUTH_CONFIG.TOKEN_EXPIRY };
    const token = sign(
      { username: user.username },
      AUTH_CONFIG.JWT_SECRET,
      signOptions
    );
    
    // Set cookie with token
    cookies().set({
      name: AUTH_CONFIG.COOKIE_NAME,
      value: token,
      httpOnly: AUTH_CONFIG.COOKIE_HTTP_ONLY,
      path: '/',
      secure: AUTH_CONFIG.COOKIE_SECURE,
      maxAge: AUTH_CONFIG.TOKEN_MAX_AGE,
      sameSite: AUTH_CONFIG.COOKIE_SAME_SITE,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 