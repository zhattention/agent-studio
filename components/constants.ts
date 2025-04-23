// Available tools and models lists
export const AVAILABLE_TOOLS = [
  "twitter_limit_search", 
  "twitter_post_tweet", 
  "start_team",
  "twitter_like_tweet",
  "twitter_retweet"
];

export const AVAILABLE_MODELS = [
  "openai/gpt-4o-mini", 
  "openai/gpt-4.1-mini", 
  "google/gemini-2.0-flash-001"
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