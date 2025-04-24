import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config/auth.config';

export interface JwtPayload {
  username: string;
}

/**
 * Verifies the JWT token from the request's cookies
 * @param request The Next.js request object
 * @returns The decoded token payload or null if invalid
 */
export function verifyAuth(request: NextRequest): JwtPayload | null {
  try {
    // Get token from cookie
    const token = request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value;
    
    if (!token) {
      console.log('Auth: 没有找到认证令牌');
      return null;
    }
    
    console.log('Auth: 找到令牌，开始验证');
    
    // Verify token
    const decoded = verify(token, AUTH_CONFIG.JWT_SECRET) as JwtPayload;
    console.log('Auth: 令牌验证成功，用户名:', decoded.username);
    return decoded;
  } catch (error) {
    console.error('Auth: 令牌验证错误:', error);
    return null;
  }
}

/**
 * Example of how to use the verifyAuth function in an API route
 * 
 * import { NextRequest, NextResponse } from 'next/server';
 * import { verifyAuth } from '@/utils/auth';
 * 
 * export async function GET(request: NextRequest) {
 *   const user = verifyAuth(request);
 *   
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   
 *   // Proceed with authorized logic
 *   return NextResponse.json({ data: 'Protected data', user: user.username });
 * }
 */ 