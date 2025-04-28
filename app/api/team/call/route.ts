import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../utils/auth';

// Force dynamic for auth checks
export const dynamic = 'force-dynamic';
// 增加响应超时时间，默认为 10 分钟
export const maxDuration = 600; // 10分钟超时限制 (单位：秒)

export async function POST(request: NextRequest) {
  // 验证认证
  const user = verifyAuth(request);
  
  if (!user) {
    console.log('[POST /api/team/call] 未授权访问');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // 从请求中获取数据
    const { team_name, content, full_message = true, execution_id = null } = await request.json();
    
    // 验证必要字段
    if (!team_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: team_name are required' 
      }, { status: 400 });
    }
    
    // 构造转发到团队服务的请求
    const apiToken = process.env.API_TOKEN;
    if (!apiToken) {
      console.error('[POST /api/team/call] API_TOKEN未设置在环境变量中');
      return NextResponse.json({ 
        error: 'Server configuration error: API_TOKEN not set' 
      }, { status: 500 });
    }
    
    // 创建一个流式响应
    const encoder = new TextEncoder();
    const startTime = Date.now(); // 记录开始时间
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 设置自定义 fetch 选项，包括超时处理
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 600000); // 10分钟超时
          
          // 发送请求到团队服务
          console.log(`[POST /api/team/call] 调用团队 ${team_name} 服务, 可能需要较长时间...`);
          
          const response = await fetch('http://localhost:8010/api/tools/team/call_stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify({
              team_name,
              content,
              full_message,
              execution_id // 传递执行ID给后端服务
            }),
            signal: abortController.signal
          }).finally(() => {
            clearTimeout(timeoutId); // 清除超时定时器
          });
          
          const reader = response.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.trim()) {
                  controller.enqueue(encoder.encode(line + '\n'));
                }
              }
            }
            
            if (buffer.trim()) {
              controller.enqueue(encoder.encode(buffer + '\n'));
            }
          }
          
          // 关闭流
          controller.close();
        } catch (error) {
          // 处理错误情况
          console.error('[POST /api/team/call] 处理请求时出错:', error);
          
          // 计算错误发生时的处理时间
          const errorTime = ((Date.now() - startTime) / 1000).toFixed(2);
          
          if (error instanceof Error && error.name === 'AbortError') {
            controller.enqueue(encoder.encode(JSON.stringify({
              status: 'error',
              error: 'Request timeout',
              message: '团队调用超时，请稍后查看结果或重试',
              processingStats: {
                elapsedSeconds: parseFloat(errorTime)
              }
            }) + '\n'));
          } else {
            controller.enqueue(encoder.encode(JSON.stringify({
              status: 'error',
              error: 'Internal server error',
              details: String(error),
              processingStats: {
                elapsedSeconds: parseFloat(errorTime)
              }
            }) + '\n'));
          }
          
          // 关闭流
          controller.close();
        }
      }
    });
    
    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    // 在流创建前发生的错误处理
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[POST /api/team/call] 请求超时，团队调用耗时过长');
      return NextResponse.json({ 
        error: 'Request timeout', 
        message: '团队调用超时，请稍后查看结果或重试' 
      }, { status: 504 });
    }
    
    console.error('[POST /api/team/call] 处理请求失败:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
} 