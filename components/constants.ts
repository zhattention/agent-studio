// Available tools and models lists
export const AVAILABLE_TOOLS = [
  "twitter_profile",
  "twitter_limit_search", 
  "twitter_user_tweets",
  "twitter_post_tweet", 
  "twitter_like_tweet",
  "twitter_retweet",
  "google_search_web",
  "telegram_send_message",
  "telegram_send_with_confirm_button",
  "crawai_scrap_by_url",
  "kol_tweets_by_duration",
  "perplexity_search",
  "start_team",
  "milvus_store",
  "milvus_query",
  "store",
  "query",
  "exec_redis_cmd",
  "binance_place_order",
  "binance_get_positions",
  "binance_set_leverage",
  "binance_close_position",
  "binance_get_balance",
  "binance_get_trades"
];

// Tool descriptions with detailed information
export const TOOL_DESCRIPTIONS = {
  "twitter_profile": {
    name: "twitter_profile",
    description: "获取Twitter用户资料信息",
    args: {
      username: "Twitter用户名"
    },
    returns: "JSON字符串，包含用户ID、名称、用户名、粉丝数、关注数等信息"
  },
  "twitter_limit_search": {
    name: "twitter_limit_search",
    description: "搜索Twitter内容（支持高级搜索操作符）",
    args: {
      query: "搜索查询（支持操作符，长度<=100）",
      mode: "搜索模式，可选 'latest'（默认）或 'top'",
      limit: "最大返回结果数（默认100）"
    },
    notes: "支持的搜索操作符：时间、用户、内容、语言等。规则参考 https://www.exportdata.io/blog/advanced-twitter-search-operators/"
  },
  "twitter_user_tweets": {
    name: "twitter_user_tweets",
    description: "获取指定用户的推文",
    args: {
      user_id: "Twitter用户ID"
    },
    returns: "用户的最新推文列表"
  },
  "twitter_post_tweet": {
    name: "twitter_post_tweet",
    description: "发送推文",
    args: {
      text: "推文内容",
      reply_to_tweet_id: "可选参数。如果提供，推文将回复指定的推文ID"
    },
    returns: "发送结果"
  },
  "twitter_like_tweet": {
    name: "twitter_like_tweet",
    description: "点赞指定的推文",
    args: {
      tweet_id: "要点赞的推文ID"
    },
    returns: "JSON字符串，包含点赞结果",
    notes: "速率限制：24小时内200次请求"
  },
  "twitter_retweet": {
    name: "twitter_retweet",
    description: "转发指定的推文",
    args: {
      tweet_id: "要转发的推文ID"
    },
    returns: "转发结果"
  },
  "google_search_web": {
    name: "google_search_web",
    description: "使用Google搜索网页内容",
    args: {
      query: "搜索关键词"
    },
    returns: "搜索结果列表"
  },
  "telegram_send_message": {
    name: "telegram_send_message",
    description: "发送Telegram消息",
    args: {
      text: "消息内容"
    },
    notes: "chat_id和threadid是从config配置里读取的",
    returns: "发送结果"
  },
  "telegram_send_with_confirm_button": {
    name: "telegram_send_with_confirm_button",
    description: "发送带确认按钮的Telegram消息",
    args: {
      text: "消息内容"
    },
    returns: "发送结果"
  },
  "crawai_scrap_by_url": {
    name: "crawai_scrap_by_url",
    description: "爬取指定URL的网页内容",
    args: {
      url: "要爬取的网页URL"
    },
    returns: "网页内容"
  },
  "kol_tweets_by_duration": {
    name: "kol_tweets_by_duration",
    description: "获取KOL在指定时间段内的推文",
    args: {
      last_minutes: "查询时间范围（默认30分钟）",
      max_results: "最大返回结果数量（默认100）",
      kols: "可选的KOL用户名列表.如果不给，则使用系统默认的kol列表"
    },
    returns: "JSON字符串，包含推文ID、内容、用户名、点赞数等信息"
  },
  "perplexity_search": {
    name: "perplexity_search",
    description: "使用Perplexity进行搜索",
    args: {
      query: "搜索关键词"
    },
    returns: "搜索结果"
  },
  "start_team": {
    name: "start_team",
    description: "启动一个团队并获取其工作结果",
    args: {
      team_name: "团队名称，对应配置文件名称",
      task_prompt: "团队任务描述"
    },
    returns: "JSON字符串，包含团队执行结果",
    notes: "团队配置文件必须存在于 `/ai_agent/configs/` 目录下"
  },
  "milvus_store": {
    name: "milvus_store",
    description: "将文档存储到 Milvus 向量数据库",
    args: {
      key: "文档的唯一标识符",
      document: "要存储的文档内容",
      dbpath: "可选的数据库路径，如果不提供则使用默认路径 milvus_store.db"
    },
    returns: "JSON字符串，包含存储结果"
  },
  "milvus_query": {
    name: "milvus_query",
    description: "在 Milvus 向量数据库中搜索相似文档",
    args: {
      query: "查询文本",
      limit: "返回结果的最大数量，默认为 5",
      dbpath: "可选的数据库路径，如果不提供则使用默认路径 milvus_store.db"
    },
    returns: "JSON字符串，包含查询结果",
    notes: "使用 OpenAI 的 text-embedding-3-small 模型生成向量，用于存储和检索语义相似的文档"
  },
  "store": {
    name: "store",
    description: "将键值对存储到 Redis",
    args: {
      key: "键名",
      value: "要存储的值"
    },
    returns: "JSON字符串，包含存储结果"
  },
  "query": {
    name: "query",
    description: "从 Redis 中查询指定键的值",
    args: {
      key: "要查询的键名"
    },
    returns: "JSON字符串，包含查询结果"
  },
  "exec_redis_cmd": {
    name: "exec_redis_cmd",
    description: "执行任意 Redis 命令",
    args: {
      command: "完整的Redis命令字符串，例如 \"set key value\" 或 \"get key\""
    },
    returns: "JSON字符串，包含命令执行结果",
    notes: "支持字符串操作、列表操作、哈希表操作、集合操作和键操作等多种Redis命令"
  },
  "binance_place_order": {
    name: "binance_place_order",
    description: "在 Binance 上下单",
    args: {
      symbol: "交易对符号，例如 BTCUSDT",
      amount: "买入的USDT数量",
      is_long: "true为开多，false为开空",
      api_key_name: "API key名称"
    },
    returns: "JSON字符串，包含订单信息"
  },
  "binance_get_positions": {
    name: "binance_get_positions",
    description: "获取所有持仓信息",
    args: {
      api_key_name: "可选的API key名称，不指定则获取所有"
    },
    returns: "JSON字符串，包含持仓信息"
  },
  "binance_set_leverage": {
    name: "binance_set_leverage",
    description: "设置杠杆倍数",
    args: {
      symbol: "交易对符号",
      leverage: "杠杆倍数 (1-125)",
      api_key_name: "API key名称"
    },
    returns: "JSON字符串，包含设置结果"
  },
  "binance_close_position": {
    name: "binance_close_position",
    description: "平仓",
    args: {
      symbol: "要平仓的交易对符号，如果为空则平仓所有持仓",
      api_key_name: "API key名称，必须指定"
    },
    returns: "JSON字符串，包含平仓结果"
  },
  "binance_get_balance": {
    name: "binance_get_balance",
    description: "获取账户余额",
    args: {
      api_key_name: "可选的API key名称，不指定则获取所有"
    },
    returns: "JSON字符串，包含账户余额信息"
  },
  "binance_get_trades": {
    name: "binance_get_trades",
    description: "获取交易记录",
    args: {
      start_time: "开始时间戳，秒级",
      end_time: "结束时间戳，秒级",
      api_key_name: "可选的API key名称筛选",
      symbol: "可选的交易对筛选"
    },
    returns: "JSON字符串，包含交易记录"
  }
};

export const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o-mini", description: "适合function call" },
  { id: "openai/gpt-4.1-mini", description: "适合遵循指令" },
  { id: "openai/chatgpt-4o-latest", description: "最新版GPT-4o，功能最强大, 贵" },
  { id: "google/gemini-2.0-flash-001", description: "适合写作, 不贵" },
  { id: "google/gemini-2.5-pro-exp-03-25", description: "Google最新Gemini Pro模型，免费" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", description: "Meta的Llama模型，开源免费" },
  { id: "anthropic/claude-3.7-sonnet", description: "Anthropic的Claude模型，擅长长文本" },
  { id: "anthropic/claude-3.7-sonnet:thinking", description: "Anthropic的Claude thinking模型，推理能力强" }
];

// Node types mapping - defined elsewhere
export const NODE_TYPE_KEYS = {
  agent: 'agent',
  team: 'team'
};

// Default connection styling
export const DEFAULT_CONNECTION_LINE_STYLE = {
  stroke: '#2563eb',
  strokeWidth: 2,
  strokeDasharray: '5,5'
};

// Default edge options
export const DEFAULT_EDGE_OPTIONS = {
  style: { strokeWidth: 2 },
  labelShowBg: true,
  labelBgStyle: { fill: 'rgba(255, 255, 255, 0.75)', fillOpacity: 0.8 },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 2
};

// Special styles for team-to-agent connections
export const TEAM_TO_AGENT_EDGE_STYLE = {
  stroke: '#2e7d32',
  strokeWidth: 2
}; 