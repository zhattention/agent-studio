import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

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

// 递归处理并保存team配置
async function saveTeamConfigRecursively(teamConfig: any, rootDir: string): Promise<string> {
  // 验证和提供默认值
  if (!teamConfig || typeof teamConfig !== 'object') {
    console.error(`[saveTeamConfigRecursively] 错误: 无效的团队配置`);
    throw new Error('Invalid team configuration');
  }

  // 确保团队名称存在
  const teamName = teamConfig.name || `unnamed_team_${Date.now()}`;
  if (!teamConfig.name) {
    console.log(`[saveTeamConfigRecursively] 警告: 团队名称未定义，使用生成的名称: ${teamName}`);
    teamConfig.name = teamName;
  }
  
  console.log(`[saveTeamConfigRecursively] 开始处理团队配置: ${teamName}`);
  console.log(`[saveTeamConfigRecursively] 团队类型: ${teamConfig.team_type || '未定义'}, 包含 ${teamConfig.agents?.length || 0} 个agents`);
  
  // 克隆配置以避免修改原始数据
  const configClone = JSON.parse(JSON.stringify(teamConfig));
  const agents = configClone.agents || [];
  
  // 处理每个agent
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    if (!agent) {
      console.log(`[saveTeamConfigRecursively] 警告: agent[${i}] 为空，跳过处理`);
      continue;
    }
    
    // 确保agent名称存在
    if (!agent.name) {
      agent.name = `unnamed_agent_${i}_${Date.now()}`;
      console.log(`[saveTeamConfigRecursively] 警告: agent[${i}] 名称未定义，使用生成的名称: ${agent.name}`);
    }
    
    console.log(`[saveTeamConfigRecursively] 处理agent[${i}]: ${agent.name}, 模型: ${agent.model || '未定义'}`);
    
    // 1. 处理agent的prompt，提取到单独文件
    if (agent.prompt && typeof agent.prompt === 'string' && agent.prompt.trim().length > 0) {
      try {
        // 创建prompt存储路径
        const promptDir = path.join(rootDir, 'prompts', teamName);
        console.log(`[saveTeamConfigRecursively] 创建prompt目录: ${promptDir}`);
        await ensureDirectoryExists(promptDir);
        
        const promptFilename = `${agent.name}.txt`;
        const promptPath = path.join(promptDir, promptFilename);
        const apiPromptPath = `/ai_agent/prompts/${teamName}/${promptFilename}`;
        
        console.log(`[saveTeamConfigRecursively] 保存 ${agent.name} 的prompt到 ${promptPath}`);
        console.log(`[saveTeamConfigRecursively] prompt长度: ${agent.prompt.length} 字符`);
        
        // 写入prompt内容到文件
        await writeFile(promptPath, agent.prompt, 'utf8');
        
        // 更新配置，使用路径引用
        agent.prompt = apiPromptPath;
        console.log(`[saveTeamConfigRecursively] 设置prompt_path: ${apiPromptPath}`);
      } catch (err) {
        console.error(`[saveTeamConfigRecursively] 保存prompt失败:`, err);
        // 继续处理其他部分，不中断整个流程
      }
    } else {
      console.log(`[saveTeamConfigRecursively] Agent ${agent.name} 没有需要处理的prompt内容`);
    }
    
    // 2. 处理team_call嵌套团队
    if (agent.team_call && agent.team_cfg) {
      try {
        console.log(`[saveTeamConfigRecursively] 发现嵌套团队: ${agent.team_call}`);
        
        // 确保子团队名称与team_call一致
        if (!agent.team_cfg.name) {
          console.log(`[saveTeamConfigRecursively] 子团队没有名称，使用team_call作为名称: ${agent.team_call}`);
          agent.team_cfg.name = agent.team_call;
        } else if (agent.team_cfg.name !== agent.team_call) {
          console.log(`[saveTeamConfigRecursively] 子团队名称(${agent.team_cfg.name})与team_call(${agent.team_call})不一致，使用team_call`);
          agent.team_cfg.name = agent.team_call;
        }
        
        console.log(`[saveTeamConfigRecursively] 确保子团队名称: ${agent.team_cfg.name}`);
        
        // 递归处理子团队
        console.log(`[saveTeamConfigRecursively] 开始递归处理子团队: ${agent.team_call}`);
        const subTeamPath = await saveTeamConfigRecursively(agent.team_cfg, rootDir);
        console.log(`[saveTeamConfigRecursively] 子团队 ${agent.team_call} 已保存到 ${subTeamPath}`);
        
        // 移除team_cfg，保留team_call引用
        delete agent.team_cfg;
        console.log(`[saveTeamConfigRecursively] 从配置中移除team_cfg内容，保留team_call引用`);
      } catch (err) {
        console.error(`[saveTeamConfigRecursively] 处理嵌套团队失败:`, err);
        // 继续处理其他部分，不中断整个流程
      }
    } else if (agent.team_call) {
      console.log(`[saveTeamConfigRecursively] Agent ${agent.name} 有team_call引用 ${agent.team_call}，但没有team_cfg数据`);
    }
  }
  
  // 保存团队配置到文件
  try {
    const configDir = path.join(rootDir, 'configs');
    console.log(`[saveTeamConfigRecursively] 确保配置目录存在: ${configDir}`);
    await ensureDirectoryExists(configDir);
    
    const configFilename = `${teamName}.json`;
    const configPath = path.join(configDir, configFilename);
    
    console.log(`[saveTeamConfigRecursively] 保存团队 ${teamName} 配置到 ${configPath}`);
    const configJson = JSON.stringify(configClone, null, 2);
    console.log(`[saveTeamConfigRecursively] 配置JSON长度: ${configJson.length} 字符`);
    await writeFile(configPath, configJson, 'utf8');
    console.log(`[saveTeamConfigRecursively] 团队 ${teamName} 配置已保存`);
    
    return configPath;
  } catch (err) {
    console.error(`[saveTeamConfigRecursively] 保存团队配置文件失败:`, err);
    throw err; // 这个是关键错误，需要抛出
  }
}

// GET 请求处理 - 获取配置文件列表
export async function GET(request: NextRequest) {
  try {
    console.log('-----------------------------------------------------------');
    console.log(`[GET /api/configs] 收到获取配置文件列表请求`);
    
    const configDir = path.join(process.cwd(), 'agent-data/configs');
    console.log(`[GET /api/configs] 读取配置目录: ${configDir}`);
    
    const files = await readdir(configDir);
    console.log(`[GET /api/configs] 找到 ${files.length} 个配置文件`);
    
    const fileDetails = await Promise.all(
      files.map(async (name) => {
        const filePath = path.join(configDir, name);
        const stats = await stat(filePath);
        
        return {
          name,
          path: `configs/${name}`,
          size: stats.size,
          modified: stats.mtime
        };
      })
    );
    
    console.log(`[GET /api/configs] 返回配置文件列表，共 ${fileDetails.length} 个文件`);
    console.log('-----------------------------------------------------------');
    return NextResponse.json(fileDetails);
  } catch (error) {
    console.error('-----------------------------------------------------------');
    console.error(`[GET /api/configs] 获取配置文件列表失败，错误:`, error);
    console.error('-----------------------------------------------------------');
    return NextResponse.json(
      { error: 'Failed to retrieve config files' },
      { status: 500 }
    );
  }
}

// POST 请求处理 - 保存配置文件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('-----------------------------------------------------------');
    console.log(`[POST /api/configs] 开始处理保存请求`);
    console.log(`[POST /api/configs] 请求体完整内容:`, JSON.stringify(body, null, 2));
    
    const { fileName, content } = body;
    console.log(`[POST /api/configs] 文件名: ${fileName}, 内容类型: ${typeof content}`);
    
    if (!fileName) {
      console.log(`[POST /api/configs] 错误: 文件名为空`);
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }
    
    if (content === undefined) {
      console.log(`[POST /api/configs] 错误: 内容为空`);
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    // 获取根目录
    const rootDir = path.join(process.cwd(), 'agent-data');
    console.log(`[POST /api/configs] 根目录: ${rootDir}`);
    
    // 递归处理和保存团队配置
    console.log(`[POST /api/configs] 开始解析并处理团队配置`);
    const teamConfig = typeof content === 'string' ? JSON.parse(content) : content;
    console.log(`[POST /api/configs] 团队名称: ${teamConfig.name || '未定义'}, 包含 ${teamConfig.agents?.length || 0} 个agents`);
    
    // 确保团队名称存在，如果不存在，使用fileName
    if (!teamConfig.name) {
      console.log(`[POST /api/configs] 警告: 团队名称未定义，使用fileName: ${fileName}`);
      teamConfig.name = fileName.replace(/\.json$/, '');
    }
    
    console.log(`[POST /api/configs] 开始递归处理团队配置, 使用名称: ${teamConfig.name}`);
    const configPath = await saveTeamConfigRecursively(teamConfig, rootDir);
    console.log(`[POST /api/configs] 团队配置已保存到: ${configPath}`);
    
    console.log(`[POST /api/configs] 保存成功，返回成功响应`);
    console.log('-----------------------------------------------------------');
    return NextResponse.json({
      success: true,
      path: `configs/${path.basename(configPath)}`,
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    console.error('-----------------------------------------------------------');
    console.error(`[POST /api/configs] 保存失败，错误:`, error);
    console.error('-----------------------------------------------------------');
    return NextResponse.json(
      { error: 'Failed to save configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
} 