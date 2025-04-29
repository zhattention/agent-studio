// Agent Team Configuration Types

// Tool Types
export type TwitterTool = 
  | 'twitter_profile'
  | 'twitter_limit_search'
  | 'twitter_user_tweets'
  | 'twitter_post_tweet'
  | 'twitter_get_liking_users'
  | 'twitter_like_tweet';

export type SearchTool = 
  | 'google_search_web'
  | 'perplexity_search';

export type TelegramTool = 
  | 'telegram_send_message'
  | 'telegram_send_with_confirm_button';

export type CrawlerTool = 
  | 'crawai_scrap_by_url';

export type KolTool = 
  | 'kol_tweets_by_duration';

export type TeamTool = 
  | 'start_team';

export type DatabaseTool = 
  | 'milvus_store'
  | 'milvus_query'
  | 'redis_store'
  | 'redis_query'
  | 'redis_exec';

export type BinanceTool = 
  | 'binance_place_order'
  | 'binance_get_positions'
  | 'binance_set_leverage'
  | 'binance_close_position'
  | 'binance_get_balance'
  | 'binance_get_trades';

export type ToolName = 
  | TwitterTool
  | SearchTool
  | TelegramTool
  | CrawlerTool
  | KolTool
  | TeamTool
  | DatabaseTool
  | BinanceTool;

// Model Types
export type ModelProvider = 'openai' | 'google' | 'meta-llama' | 'anthropic';
export type ModelName = string;
export type FullModelName = `${ModelProvider}/${ModelName}`;

// Tool Call Parameter Types
export interface ValueParam {
  type: 'value';
  value: string | number | boolean | object;
}

export interface HistoryGrabParam {
  type: 'history_grab';
  value: number; // Index of history message to grab
}

export interface XmlGrabParam {
  type: 'xml_grab';
  value: string; // XML tag name to grab content from
}

export type ToolCallParam = ValueParam | HistoryGrabParam | XmlGrabParam;

// Agent Configuration
export interface ModelInfo {
  vision?: boolean;
  function_calling?: boolean;
  json_output?: boolean;
  family?: string;
  structured_output?: boolean;
}

export interface AgentConfig {
  name: string;
  tools: ToolName[];
  model: FullModelName | string;
  model_info?: ModelInfo;
  prompt?: string;
  transition_prompt?: string;
  team_call?: string;
  team_call_tag?: string;
  full_message?: boolean;
  must_tool?: boolean;
  force_tool_call?: string;
  force_tool_args?: Record<string, ToolCallParam>;
} 