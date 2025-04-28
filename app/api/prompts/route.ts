import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { verifyAuth } from '../../../utils/auth';

// Force dynamic since this route uses request params
export const dynamic = 'force-dynamic';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// 将 /ai_agent 路径映射到 ./agent-data
function mapPathToAgentData(filePath: string): string {
  if (filePath.startsWith('/ai_agent/')) {
    return filePath.replace('/ai_agent/', 'agent-data/');
  } 
  return filePath;
}

// 确保目录存在
async function ensureDirectoryExists(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // 如果目录已经存在，忽略错误
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// GET 请求处理 - 获取提示文件列表或读取特定提示文件
export async function GET(request: NextRequest) {
  // 验证认证
  const user = verifyAuth(request);
  
  if (!user) {
    console.log('[GET /api/prompts] 未授权访问');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 检查是否有 path 参数，如果有，则读取特定的提示文件
  const searchParams = request.nextUrl.searchParams;
  const promptPath = searchParams.get('path');
  
  console.log('-----------------------------------------------------------');
  console.log(`[GET /api/prompts] 收到请求${promptPath ? '，读取特定文件' : '，获取文件列表'}`);
  
  // 如果没有 path 参数，返回所有提示文件列表
  if (!promptPath) {
    try {
      const promptDir = path.join(process.cwd(), 'agent-data/prompts');
      console.log(`[GET /api/prompts] 读取prompts目录: ${promptDir}`);
      
      const files = await readdir(promptDir);
      console.log(`[GET /api/prompts] 找到 ${files.length} 个文件`);
      
      const fileDetails = await Promise.all(
        files.map(async (name) => {
          const filePath = path.join(promptDir, name);
          const stats = await stat(filePath);
          
          return {
            name,
            path: `prompts/${name}`,
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      
      console.log(`[GET /api/prompts] 返回文件列表，共 ${fileDetails.length} 个文件`);
      console.log('-----------------------------------------------------------');
      return NextResponse.json(fileDetails);
    } catch (error) {
      console.error('-----------------------------------------------------------');
      console.error(`[GET /api/prompts] 获取prompt文件列表失败，错误:`, error);
      console.error('-----------------------------------------------------------');
      return NextResponse.json(
        { error: 'Failed to retrieve prompt files' },
        { status: 500 }
      );
    }
  }
  
  // 如果有 path 参数，读取特定的提示文件
  try {
    console.log(`[GET /api/prompts] 请求读取prompt文件: ${promptPath}`);
    
    // 映射路径
    const mappedPath = mapPathToAgentData(promptPath);
    console.log(`[GET /api/prompts] 映射路径从 ${promptPath} 到 ${mappedPath}`);
    
    // 构建绝对路径（确保路径安全，防止目录遍历）
    const normalizedPath = path.normalize(mappedPath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(process.cwd(), normalizedPath);
    
    console.log(`[GET /api/prompts] 尝试读取绝对路径: ${absolutePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      console.error(`[GET /api/prompts] 文件不存在: ${absolutePath}`);
      return NextResponse.json(
        { error: 'Prompt file not found', path: absolutePath },
        { status: 404 }
      );
    }
    
    // 读取文件内容
    console.log(`[GET /api/prompts] 开始读取文件内容`);
    const content = await readFile(absolutePath, 'utf8');
    console.log(`[GET /api/prompts] 文件内容已读取，长度: ${content.length} 字符`);
    
    console.log(`[GET /api/prompts] 读取成功，返回内容`);
    console.log('-----------------------------------------------------------');
    return NextResponse.json({
      success: true,
      path: promptPath,
      content,
      isRawText: true
    });
  } catch (error) {
    console.error('-----------------------------------------------------------');
    console.error(`[GET /api/prompts] 读取prompt文件失败，错误:`, error);
    console.error('-----------------------------------------------------------');
    return NextResponse.json(
      { error: 'Failed to read prompt path', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST 请求处理 - 用于读取或保存提示文件
export async function POST(request: NextRequest) {
  // 验证认证
  const user = verifyAuth(request);
  
  if (!user) {
    console.log('[POST /api/prompts] 未授权访问');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    console.log('-----------------------------------------------------------');
    console.log('[POST /api/prompts] 收到请求');
    console.log(`[POST /api/prompts] 请求体完整内容:`, JSON.stringify(body, null, 2));
    console.log(`[POST /api/prompts] 请求内容类型: ${body.content ? '保存prompt' : '读取prompt'}`);
    
    const { promptPath, content } = body;
    
    if (!promptPath) {
      console.error('[POST /api/prompts] 错误: 缺少promptPath参数');
      return NextResponse.json(
        { error: 'Prompt path is required' },
        { status: 400 }
      );
    }
    
    // 如果提供了content，这是一个保存操作
    if (content !== undefined) {
      console.log(`[POST /api/prompts] 保存prompt到路径: ${promptPath}`);
      
      // 映射路径
      const mappedPath = mapPathToAgentData(promptPath);
      console.log(`[POST /api/prompts] 映射路径从 ${promptPath} 到 ${mappedPath}`);
      
      // 构建绝对路径（确保路径安全，防止目录遍历）
      const normalizedPath = path.normalize(mappedPath).replace(/^(\.\.[\/\\])+/, '');
      const absolutePath = path.join(process.cwd(), normalizedPath);
      
      console.log(`[POST /api/prompts] 保存到绝对路径: ${absolutePath}`);
      console.log(`[POST /api/prompts] 内容长度: ${content.length} 字符`);
      
      try {
        // 确保目录存在
        const dirPath = path.dirname(absolutePath);
        console.log(`[POST /api/prompts] 确保目录存在: ${dirPath}`);
        await ensureDirectoryExists(dirPath);
        
        // 写入文件内容
        console.log(`[POST /api/prompts] 开始写入文件内容`);
        await writeFile(absolutePath, content, 'utf8');
        console.log(`[POST /api/prompts] 文件内容已写入`);
        
        console.log(`[POST /api/prompts] 保存成功，返回成功响应`);
        console.log('-----------------------------------------------------------');
        return NextResponse.json({
          success: true,
          path: promptPath,
          message: 'Prompt saved successfully'
        });
      } catch (err) {
        console.error(`[POST /api/prompts] 写入文件失败:`, err);
        throw err;
      }
    } 
    // 否则这是一个读取操作 
    else {
      console.log(`[POST /api/prompts] 读取prompt路径: ${promptPath}`);
      
      // 映射路径
      const mappedPath = mapPathToAgentData(promptPath);
      console.log(`[POST /api/prompts] 映射路径从 ${promptPath} 到 ${mappedPath}`);
      
      // 构建绝对路径（确保路径安全，防止目录遍历）
      const normalizedPath = path.normalize(mappedPath).replace(/^(\.\.[\/\\])+/, '');
      const absolutePath = path.join(process.cwd(), normalizedPath);
      
      console.log(`[POST /api/prompts] 尝试读取绝对路径: ${absolutePath}`);
      
      // 检查文件是否存在
      if (!fs.existsSync(absolutePath)) {
        console.error(`[POST /api/prompts] 文件不存在: ${absolutePath}`);
        return NextResponse.json(
          { error: 'Prompt file not found', path: absolutePath },
          { status: 404 }
        );
      }
      
      // 读取文件内容
      console.log(`[POST /api/prompts] 开始读取文件内容`);
      try {
        const content = await readFile(absolutePath, 'utf8');
        console.log(`[POST /api/prompts] 文件内容已读取，长度: ${content.length} 字符`);
        
        console.log(`[POST /api/prompts] 读取成功，返回内容`);
        console.log('-----------------------------------------------------------');
        return NextResponse.json({
          success: true,
          path: promptPath,
          content,
          isRawText: true
        });
      } catch (err) {
        console.error(`[POST /api/prompts] 读取文件失败:`, err);
        throw err;
      }
    }
  } catch (error) {
    console.error('-----------------------------------------------------------');
    console.error(`[POST /api/prompts] 处理请求失败，错误:`, error);
    console.error('-----------------------------------------------------------');
    return NextResponse.json(
      { error: 'Failed to process prompt request', message: (error as Error).message },
      { status: 500 }
    );
  }
} 