import { NextResponse } from 'next/server';
import { USERS } from '../../../../config/auth.config';

// For consistency with other auth routes
export const dynamic = 'force-dynamic';

export async function GET() {
  // 检查是否有配置的用户
  const usersConfigured = USERS.length > 0;
  
  console.log('Auth Check API: 已配置用户数量:', USERS.length);
  
  return NextResponse.json({ 
    usersConfigured,
    message: usersConfigured 
      ? '用户已正确配置' 
      : '未配置有效用户，请检查环境变量'
  });
} 