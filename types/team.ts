import { AgentConfig } from './agent';

// Team Configuration Types

export interface TwitterConfig {
  bearer_token?: string;
  consumer_key: string;
  consumer_secret: string;
  access_token: string;
  access_token_secret: string;
}

export interface TelegramConfig {
  bot_token: string;
  chat_id: string;
  thread_id?: string;
}

export type TeamType = 'round_robin' | 'sequential' | 'parallel';

export interface TeamConfig {
  name: string;
  team_type: TeamType;
  team_prompt: string;
  max_turn?: number;
  agents: AgentConfig[];
  twitter?: TwitterConfig;
  telegram?: TelegramConfig;
  duration: number;
  max_duration?: number;
  print_message_thread?: boolean;
  terminate_keyword?: string;
}

// Team Call API Types
export interface TeamCallOptions {
  team_name: string;
  task_prompt: string;
  full_history?: boolean; // Whether to return the full history of agent interactions
  full_state?: boolean;   // Whether to return the team state
  recover_state?: string; // Team state to recover from
  max_turn?: number;      // Override max_turn from team config
}

export interface TeamCallResponse {
  success: boolean;
  team_name: string;
  result: string;
  full_history?: Array<{
    role: string;
    content: string;
    agent?: string;
    timestamp?: string;
  }>;
  state?: object;
} 