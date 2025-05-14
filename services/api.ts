/**
 * API 服务 - 封装所有 fetch 调用
 */

import { rootStore } from "@/stores/StoreContext";


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

// 调用团队功能
export const callTeam = (
  teamName: string, 
  content: string, 
  fullMessage: boolean = true
): Promise<{result: string, status: string, error?: string}> => {
  // 使用我们的后端API作为代理
  return fetchAPI('/api/team/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      team_name: teamName,
      content: content,
      full_message: fullMessage 
    }),
  });
};

// 流式调用团队功能
export const streamCallTeam = (
  teamName: string,
  content: string,
  onUpdate: (data: any) => void,
  onComplete: (data: any) => void,
  onError: (error: any) => void,
  fullMessage: boolean = true
): { abort: () => void } => {
  const abortController = new AbortController();
  
  const threadStore = rootStore.threadStore;

  const executionId = threadStore?.addExecutionResult(teamName);
  
  (async () => {
    try {
      const response = await fetch('/api/team/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: teamName,
          content: content,
          full_message: fullMessage
        }),
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const text = decoder.decode(value, { stream: true });
        buffer += text;
        
        let startPos = 0;
        for (let i = 0; i < buffer.length; i++) {
          if (buffer[i] === '\n') {
            const line = buffer.substring(startPos, i).trim();
            startPos = i + 1;
            
            if (line) {
              try {
                const data = JSON.parse(line);
                // 将解析后的数据传给threadStore处理
                if (threadStore && executionId) {
                  threadStore.processStreamData(executionId, data);
                }
                onUpdate(data);
              } catch (e) {
                console.error('解析JSON数据失败:', e, line);
              }
            }
          }
        }
        
        if (startPos < buffer.length) {
          buffer = buffer.substring(startPos);
        } else {
          buffer = '';
        }
      }
      
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim());
          if (threadStore && executionId) {
            threadStore.processStreamData(executionId, data);
          }
          onUpdate(data);
        } catch (e) {
          console.error('解析剩余JSON数据失败:', e, buffer);
        }
      }
      
      if (threadStore && executionId) {
        threadStore.completeExecution(executionId);
      }
      onComplete("");
    } catch (error) {
      console.error(`流式API错误:`, error);
      if (threadStore && executionId) {
        threadStore.handleError(executionId, error);
      }
      onError(error);
    }
  })();
  
  return {
    abort: () => {
      if (threadStore && executionId) {
        threadStore.handleAbort(executionId);
      }
      abortController.abort();
    }
  };
};

// Workspace management APIs
export const saveWorkspace = async (workspaceName: string, data: any) => {
  try {
    console.log(`Saving workspace "${workspaceName}"...`, {
      hasNodes: !!data.nodes,
      nodeCount: data.nodes?.length,
      hasEdges: !!data.edges,
      edgeCount: data.edges?.length,
    });
    
    const response = await fetch('/api/workspace/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: workspaceName,
        data
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from server:', errorText);
      throw new Error('Failed to save workspace: ' + errorText);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving workspace:', error);
    throw error;
  }
};

export const getWorkspaceList = async () => {
  try {
    const response = await fetch('/api/workspace/list');
    if (!response.ok) {
      throw new Error('Failed to get workspace list');
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting workspace list:', error);
    throw error;
  }
};

export const getWorkspaceVersions = async (workspaceName: string) => {
  try {
    const response = await fetch(`/api/workspace/versions/${workspaceName}`);
    if (!response.ok) {
      throw new Error('Failed to get workspace versions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting workspace versions:', error);
    throw error;
  }
};

export const loadWorkspace = async (workspaceName: string, version: string) => {
  try {
    const response = await fetch(`/api/workspace/load/${workspaceName}/${version}`);
    if (!response.ok) {
      throw new Error('Failed to load workspace');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading workspace:', error);
    throw error;
  }
};

export const deleteWorkspace = async (workspaceName: string, version: string) => {
  try {
    const response = await fetch(`/api/workspace/delete/${workspaceName}/${version}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete workspace');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting workspace:', error);
    throw error;
  }
};
