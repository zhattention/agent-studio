import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';

// Force dynamic for auth checks
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 验证认证
  const user = verifyAuth(request);
  
  if (!user) {
    console.log('[GET /api/job/list] 未授权访问');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // 构造转发到团队服务的请求
    const apiToken = process.env.API_TOKEN;
    if (!apiToken) {
      console.error('[GET /api/job/list] API_TOKEN未设置在环境变量中');
      return NextResponse.json({ 
        error: 'Server configuration error: API_TOKEN not set' 
      }, { status: 500 });
    }
    
    // 发送请求到后端服务
    console.log(`[GET /api/job/list] 获取任务列表`);
    
    const response = await fetch('http://localhost:8010/api/tools/team/job/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
   
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GET /api/job/list] 后端服务返回错误: ${response.status}`, errorText);
      return NextResponse.json({ 
        error: `Backend service error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log("data", data);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-cache, max-age=0' } });
    
  } catch (error) {
    console.error('[GET /api/job/list] 处理请求失败:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
} 