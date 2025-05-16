import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';

// Force dynamic for auth checks
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 验证认证
  const user = verifyAuth(request);
  
  if (!user) {
    console.log('[POST /api/job/stop] 未授权访问');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // 从请求中获取数据
    const { team_name } = await request.json();
    
    // 验证必要字段
    if (!team_name) {
      return NextResponse.json({ 
        error: 'Missing required field: team_name is required' 
      }, { status: 400 });
    }
    
    // 构造转发到团队服务的请求
    const apiToken = process.env.API_TOKEN;
    if (!apiToken) {
      console.error('[POST /api/job/stop] API_TOKEN未设置在环境变量中');
      return NextResponse.json({ 
        error: 'Server configuration error: API_TOKEN not set' 
      }, { status: 500 });
    }
    
    // 发送请求到后端服务
    console.log(`[POST /api/job/stop] 停止团队任务 ${team_name}`);
    
    const response = await fetch('http://localhost:8010/api/tools/team/job/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({ team_name })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[POST /api/job/stop] 后端服务返回错误: ${response.status}`, errorText);
      return NextResponse.json({ 
        error: `Backend service error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[POST /api/job/stop] 处理请求失败:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
} 