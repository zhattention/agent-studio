// 通用类型
export interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

// 代理节点数据类型
export interface AgentNodeData {
  name: string;
  tools: string[];
  model: string;
  prompt: string;
  transition_prompt?: string;
  prompt_path?: string;
  _sourceConfig?: string;
  [key: string]: any;
}

// 团队节点数据类型
export interface TeamNodeData {
  name: string;
  team_type: 'round_robin' | 'tree' | 'parallel';
  agentCount?: number;
  [key: string]: any;
}

// 团队配置类型
export interface TeamConfig {
  name: string;
  team_type: string;
  team_prompt: string;
  agents: AgentNodeData[];
  duration: number;
  twitter?: {
    bearer_token: string;
    consumer_key: string;
    consumer_secret: string;
    access_token: string;
    access_token_secret: string;
  };
  [key: string]: any;
}

// UI节点类型
export interface AgentNode {
  id: string;
  type: 'agent';
  position: {
    x: number;
    y: number;
  };
  data: AgentNodeData;
}

export interface TeamNode {
  id: string;
  type: 'team';
  position: {
    x: number;
    y: number;
  };
  data: TeamNodeData;
}

export type Node = AgentNode | TeamNode;

// 边类型
export interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  style?: React.CSSProperties;
}

// 文件信息类型
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: Date;
}

// Re-export all types from other files
export * from './agent';
export * from './team';
export * from './agentFlow';

// Add any other type exports here 