import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';

// Force dynamic to handle headers and cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Skip this route in production build
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This debug endpoint is not available in production' },
      { status: 404 }
    );
  }

  try {
    // 尝试获取认证信息
    const auth = verifyAuth(request);
    
    // 获取请求信息
    const headers = Object.fromEntries(request.headers.entries());
    const cookies = request.cookies.getAll();
    
    // 安全处理 - 不显示完整的cookie和token值
    const safeCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.name === 'auth_token' ? '**隐藏**' : cookie.value,
    }));
    
    // 只保留安全的头信息
    const safeHeaders = { ...headers };
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;
    
    return NextResponse.json({
      success: true,
      auth: auth ? { username: auth.username } : null,
      authenticated: !!auth,
      cookies: safeCookies,
      headers: safeHeaders,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('中间件测试出错:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
} 