import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { log } from 'console';
import { verifyAuth } from '../../../utils/auth';

// Force dynamic since this route uses request body
export const dynamic = 'force-dynamic';

const readFile = promisify(fs.readFile);

// 将 /ai_agent 路径映射到 ./agent-data
function mapPathToAgentData(filePath: string): string {
  if (filePath.startsWith('/ai_agent/')) {
    return filePath.replace('/ai_agent/', 'agent-data/');
  } 
  return "./agent-data/" + filePath;
}

// 读取文件内容的辅助函数
async function readFileContent(filePath: string): Promise<string> {
  const mappedPath = mapPathToAgentData(filePath);
  const normalizedPath = path.normalize(mappedPath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.join(process.cwd(), normalizedPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  return await readFile(absolutePath, 'utf8');
}

// 处理JSON中的prompt字段
async function processPrompts(data: any): Promise<any> {
  // 如果是数组，递归处理每个元素
  if (Array.isArray(data)) {
    const result: any[] = [];
    for (const item of data) {
      result.push(await processPrompts(item));
    }
    return result;
  }
  
  // 如果不是对象或为null，直接返回
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // 克隆对象以避免修改原始数据
  const result = { ...data };
  
  // 处理agents数组
  console.log('处理agents数组:', result.agents);

  if (result.agents && Array.isArray(result.agents)) {
    for (const agent of result.agents) {
      // 检查prompt是否是路径
      if (agent.prompt && typeof agent.prompt === 'string' && agent.prompt.startsWith('/ai_agent/')) {
        try {
          console.log(`处理prompt路径: ${agent.prompt}`);
          agent.prompt = await readFileContent(agent.prompt);
          console.log(`成功加载prompt文件，长度: ${agent.prompt.length} 字符`);
        } catch (error) {
          console.error(`加载prompt文件失败: ${agent.prompt}`, error);
          // 保留原始路径，不中断流程
        }
      }
    }
  }
  
  return result;
}

// POST 请求处理 - 加载文件内容
export async function POST(request: NextRequest) {
  // 验证认证
  const user = verifyAuth(request);
  
  if (!user) {
    console.log('[POST /api/load-file] 未授权访问');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { filePath } = await request.json();
    console.log('POST /api/load-file - Request filePath:', filePath);
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    // 映射路径
    const mappedPath = mapPathToAgentData(filePath);
    console.log(`POST /api/load-file - Mapped path from ${filePath} to ${mappedPath}`);
    
    // 构建绝对路径（确保路径安全，防止目录遍历）
    const normalizedPath = path.normalize(mappedPath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(process.cwd(), normalizedPath);
    
    console.log('POST /api/load-file - Attempting to read:', absolutePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      console.error(`POST /api/load-file - File not found: ${absolutePath}`);
      return NextResponse.json(
        { error: 'File not found', path: absolutePath },
        { status: 404 }
      );
    }
    
    // 读取文件内容
    const content = await readFile(absolutePath, 'utf8');
    
    // 检测文件类型
    const isJson = path.extname(absolutePath) === '.json';
    let parsedContent: any;
    
    if (isJson) {
      // 解析JSON
      parsedContent = JSON.parse(content);
      
      // 处理JSON中的prompt路径
      parsedContent = await processPrompts(parsedContent);
    } else {
      parsedContent = content;
    }
    
    const response = {
      success: true,
      path: filePath,
      content: parsedContent,
      isRawText: !isJson
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error loading file:', error);
    return NextResponse.json(
      { error: 'Failed to load file', message: (error as Error).message },
      { status: 500 }
    );
  }
} 