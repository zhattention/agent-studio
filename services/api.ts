/**
 * API 服务 - 封装所有 fetch 调用
 */

// 定义接口类型
interface ApiResponse<T = any> {
  content?: T;
  path?: string;
  success?: boolean;
  message?: string;
  isRawText?: boolean;
  error?: string;
}

// 定义配置文件接口
interface Config {
  name: string;
  team_type?: string;
  team_prompt?: string;
  agents: Array<{
    name: string;
    tools?: string[];
    model: string;
    team_call?: string;
    team_cfg?: Config;
    prompt?: string;
    transition_prompt?: string;
  }>;
  [key: string]: any; // 允许其他属性
}

// 通用 fetch 方法
const fetchAPI = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// 获取配置文件列表
export const getConfigFiles = (): Promise<Array<{name: string, path: string, size: number, modified: Date}>> => {
  return fetchAPI('/api/configs');
};

// 获取提示文件列表
export const getPromptFiles = (): Promise<Array<{name: string, path: string, size: number, modified: Date}>> => {
  return fetchAPI('/api/prompts');
};

// 加载文件内容
export const loadFile = (filePath: string): Promise<ApiResponse> => {
  return fetchAPI('/api/load-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filePath }),
  });
};

export const loadConfigRecursively = async (filePath: string): Promise<Config> => {
  const cfg = await fetchAPI<ApiResponse>('/api/load-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filePath }),
  });

  const cfg_json = cfg.content as Config;
  for (const agent of cfg_json.agents) {
    if (agent.team_call) {
      const team_cfg = await loadConfigRecursively('configs/' + agent.team_call + '.json');
      agent.team_cfg = team_cfg;
    }
  }

  return cfg_json;
};

// 保存配置文件
export const saveConfig = (fileName: string, content: any): Promise<ApiResponse> => {
  // 确保文件名非空，如果为空则使用默认名称
  const validFileName = fileName || 
                       (content && content.name) || 
                       `config_${new Date().getTime()}`;
  
  // 确保内容中的name字段与文件名一致
  const updatedContent = typeof content === 'object' ? {
    ...content,
    name: content.name || validFileName
  } : content;
  
  return fetchAPI('/api/configs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: `${validFileName}.json`,
      content: updatedContent
    }),
  });
};
