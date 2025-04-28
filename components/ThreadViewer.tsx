'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../stores/StoreContext';
import { ExecutionResult, ThreadEvent, ThreadEventType } from '../stores/ThreadStore';
import { observer } from 'mobx-react-lite';

interface Opinion {
  type: string;
  facts: string[];
  opinion: string;
  confidence: number;
  timestamp: string;
}

interface Message {
  source: string;
  content: string | any;
  type: string;
  models_usage?: any;
  metadata?: any;
}

interface ThreadData {
  messages: Message[];
  stop_reason?: string;
}

interface ThreadViewerProps {
  data: ThreadData | any;
  title: string;
  onClose: () => void;
}

const MESSAGES_PER_BATCH = 20;

// 使用 mobx observer 包装组件，确保能够响应 mobx store 的变化
const ThreadViewer: React.FC<ThreadViewerProps> = observer(({ 
  data, 
  title, 
  onClose 
}) => {
  const { threadStore } = useStore();
  const [activeTab, setActiveTab] = useState<string>('conversations');
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [conversations, setConversations] = useState<Message[]>([]);
  const [hasOpinions, setHasOpinions] = useState(false);
  const [collapsedMessages, setCollapsedMessages] = useState<{[key: string]: boolean}>({});
  const [visibleMessages, setVisibleMessages] = useState<number>(MESSAGES_PER_BATCH);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef<boolean>(true);
  
  // Get the execution result from the threadStore
  const execution = useMemo(() => {
    // 优先使用 threadStore 中的当前执行结果
    if (data?.id) {
      return threadStore.getExecutionById(data.id) || data;
    } else if (threadStore.currentExecution) {
      return threadStore.currentExecution;
    }
    return data;
  }, [data, threadStore, threadStore.currentExecution]);

  // 直接获取所有 agent 的所有线程并展平为一个数组
  const allThreads: ThreadEvent[] = (() => {
    if (!execution?.agents) return [];
    
    const result: ThreadEvent[] = [];
    
    // 收集所有 agent 的所有线程
    Object.keys(execution.agents).forEach(agentName => {
      const agentThreads = execution.agents[agentName];
      if (agentThreads?.length) {
        // 将每个 agent 的线程添加到结果数组中
        result.push(...agentThreads);
      }
    });
    
    // 按时间排序
    return result.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });
  })();
  
  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current && activeTab === 'conversations' && isAutoScrollEnabled.current) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [allThreads.length, activeTab]);
  
  // 在控制台记录线程数量的变化
  useEffect(() => {
    if (execution?.agents) {
      console.log("Agents:", Object.keys(execution.agents));
      console.log(`Total threads: ${allThreads.length}`);
    }
  }, [execution, allThreads.length]);
  
  // Add scroll handler for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const scrollPosition = scrollTop + clientHeight;
      
      // If we're close to the bottom and have more messages to load
      if (scrollPosition >= scrollHeight - 300 && visibleMessages < conversations.length) {
        setVisibleMessages(prev => Math.min(prev + MESSAGES_PER_BATCH, conversations.length));
      }
      
      // 如果用户向上滚动超过100px，禁用自动滚动
      if (scrollHeight - (scrollTop + clientHeight) > 100) {
        isAutoScrollEnabled.current = false;
      } 
      // 如果用户滚动到底部，重新启用自动滚动
      else if (scrollHeight - (scrollTop + clientHeight) < 10) {
        isAutoScrollEnabled.current = true;
      }
    };
    
    const currentRef = containerRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [visibleMessages, conversations.length]);
  
  // 添加自动刷新按钮相关状态
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // 增加重新启用自动滚动的功能
  const enableAutoScroll = useCallback(() => {
    isAutoScrollEnabled.current = true;
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // 在 UI 中显示执行状态
  const renderExecutionStatus = useCallback(() => {
    if (!execution) return null;
    
    const getStatusClass = () => {
      switch (execution.status) {
        case 'running': return 'status-running';
        case 'completed': return 'status-completed';
        case 'error': return 'status-error';
        default: return '';
      }
    };
    
    return (
      <div className={`execution-status ${getStatusClass()}`}>
        {execution.status === 'running' && '🔄 执行中'}
        {execution.status === 'completed' && '✅ 已完成'}
        {execution.status === 'error' && `❌ 错误: ${execution.error || '未知错误'}`}
      </div>
    );
  }, [execution]);

  const renderMessageContent = useCallback((message: Message | ThreadEvent) => {
    const { content, type } = message;
    
    // Handle different content types
    if (typeof content === 'string') {
      return <div className="text-content">{content}</div>;
    } 
    
    if (Array.isArray(content)) {
      return (
        <div className="array-content">
          {content.map((item, index) => (
            <div key={index} className="array-item">
              {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
            </div>
          ))}
        </div>
      );
    }
    
    if (type === 'ToolCallRequestEvent' || type === 'ToolCallExecutionEvent') {
      return (
        <div className="tool-call">
          <div className="tool-call-header">Tool Call</div>
          <pre className="tool-call-content">{JSON.stringify(content, null, 2)}</pre>
        </div>
      );
    }
    
    // Default to JSON string for objects
    return <pre className="json-content">{JSON.stringify(content, null, 2)}</pre>;
  }, []);

  // 渲染对话内容
  const renderConversation = () => {
    console.log(`Rendering conversation with ${allThreads.length} threads`);
    
    if (!allThreads.length) {
      return (
        <div className="no-agents">
          <p>No messages available</p>
        </div>
      );
    }
    
    const toggleThreadMessageCollapse = (index: string) => {
      setCollapsedMessages(prev => ({
        ...prev,
        [index]: !prev[index]
      }));
    };
    
    return (
      <div className="conversation-container">
        {allThreads.map((thread, threadIndex) => {
          const messageId = `thread_${threadIndex}`;
          const isCollapsed = collapsedMessages[messageId];
          
          return (
            <div key={messageId} className="message-bubble">
              <div className="message-header" onClick={() => toggleThreadMessageCollapse(messageId)}>
                <div 
                  className="source-badge" 
                  style={{ backgroundColor: getSourceColor(thread.source) }}
                >
                  {thread.source}
                </div>
                {thread.type && <div className="message-type">{thread.type}</div>}
                <div className="collapse-toggle">
                  {isCollapsed ? '▶ 展开' : '▼ 折叠'}
                </div>
              </div>
              
              {isCollapsed ? (
                <div 
                  className="message-preview" 
                  onClick={() => toggleThreadMessageCollapse(messageId)}
                >
                  {typeof thread.content === 'string' 
                    ? (thread.content.length > 100 ? `${thread.content.slice(0, 100)}...` : thread.content)
                    : `[${thread.type} data]`
                  }
                </div>
              ) : (
                <div className="message-content">
                  {renderMessageContent(thread)}
                </div>
              )}
              
              {!isCollapsed && thread.models_usage && (
                <div className="message-footer">
                  <div className="token-usage">
                    {thread.models_usage.prompt_tokens && (
                      <span>Prompt: {thread.models_usage.prompt_tokens} tokens</span>
                    )}
                    {thread.models_usage.completion_tokens && (
                      <span>Completion: {thread.models_usage.completion_tokens} tokens</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const renderRawMessages = useCallback(() => {
    return (
      <div className="raw-messages">
        <pre>{JSON.stringify(execution, null, 2)}</pre>
      </div>
    );
  }, [execution]);
  
  const collapseAllMessages = useCallback(() => {
    const allCollapsed: {[key: string]: boolean} = {};
    
    // 折叠所有线程消息
    allThreads.forEach((_, index) => {
      allCollapsed[`thread_${index}`] = true;
    });
    
    setCollapsedMessages(allCollapsed);
  }, [allThreads]);
  
  const expandAllMessages = useCallback(() => {
    setCollapsedMessages({});
  }, []);

  // 添加自动刷新功能
  useEffect(() => {
    // 只有当自动刷新打开时才定期刷新
    if (!autoRefresh) return;
    
    // 有执行ID且执行状态为运行中时，启动自动刷新
    if (execution?.id && execution.status === 'running') {
      console.log('Auto refresh enabled for execution:', execution.id);
      
      // 设置定时器，每秒检查一次最新数据
      const intervalId = setInterval(() => {
        // 在这里，我们只需要触发一个重新渲染即可
        // 这里使用一个临时状态更新来强制组件重新渲染
        // 实际上不需要存储这个值，仅用于触发更新
        const now = new Date().getTime();
        console.log(`Auto refresh tick at ${now}`);
        
        // 这一行会触发组件重新渲染，从而获取最新数据
        setAutoRefreshTime(now);
      }, 1000);
      
      // 清理定时器
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, execution?.id, execution?.status]);
  
  // 添加一个临时状态，仅用于触发自动更新
  const [autoRefreshTime, setAutoRefreshTime] = useState<number>(0);

  // 在组件卸载时，确保停止所有定时器
  useEffect(() => {
    return () => {
      console.log('ThreadViewer unmounting, cleaning up...');
    };
  }, []);

  const getConfidenceColorClass = useCallback((confidence: number): string => {
    if (confidence >= 0.8) return 'high-confidence';
    if (confidence >= 0.5) return 'medium-confidence';
    return 'low-confidence';
  }, []);

  const getTypeIcon = useCallback((type: string): string => {
    switch (type.toLowerCase()) {
      case 'economic':
        return '📈';
      case 'political':
        return '🏛️';
      case 'social':
        return '👥';
      case 'technology':
        return '💻';
      default:
        return '📝';
    }
  }, []);

  const getSourceColor = useCallback((source: string): string => {
    // Generate a deterministic color based on the source name
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      hash = source.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use hsl for better readability with fixed saturation and lightness
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 40%)`;
  }, []);

  const toggleMessageCollapse = useCallback((index: string) => {
    setCollapsedMessages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const getMessagePreview = useCallback((message: Message): string => {
    const { content, type } = message;
    
    if (typeof content === 'string') {
      const previewLength = 100;
      return content.length > previewLength 
        ? content.substring(0, previewLength) + '...' 
        : content;
    }
    
    if (Array.isArray(content)) {
      return `[Array with ${content.length} items]`;
    }
    
    if (type === 'ToolCallRequestEvent') {
      return 'Tool Call Request';
    }
    
    if (type === 'ToolCallExecutionEvent') {
      return 'Tool Call Execution';
    }
    
    return 'Object Data';
  }, []);

  const renderOpinions = useCallback(() => {
    if (opinions.length === 0) {
      return (
        <div className="no-opinions">
          <p>No opinions found in this data.</p>
        </div>
      );
    }
    
    return (
      <div className="opinions-grid">
        {opinions.map((opinion, index) => (
          <div key={index} className="opinion-card">
            <div className="opinion-header">
              <div className="opinion-type">
                <span className="type-icon">{getTypeIcon(opinion.type)}</span>
                <span className="type-text">{opinion.type}</span>
              </div>
              <div className={`confidence-meter ${getConfidenceColorClass(opinion.confidence)}`}>
                <span className="confidence-value">{(opinion.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="opinion-content">
              <p className="opinion-text">{opinion.opinion}</p>
              {opinion.facts && opinion.facts.length > 0 && (
                <div className="facts-container">
                  <h4 className="facts-header">Based on:</h4>
                  {opinion.facts.map((fact, idx) => (
                    <div key={idx} className="fact-item">
                      {fact}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="opinion-footer">
              <span className="timestamp">{opinion.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [opinions, getTypeIcon, getConfidenceColorClass]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content thread-viewer" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-tabs">
            {hasOpinions && (
              <button 
                className={`tab-button ${activeTab === 'opinions' ? 'active' : ''}`}
                onClick={() => setActiveTab('opinions')}
              >
                Opinions
              </button>
            )}
            <button 
              className={`tab-button ${activeTab === 'conversations' ? 'active' : ''}`}
              onClick={() => setActiveTab('conversations')}
            >
              Conversation
            </button>
            <button 
              className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              Raw Data
            </button>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {activeTab === 'conversations' && (
          <div className="conversation-actions">
            <button className="button small-button" onClick={collapseAllMessages}>全部折叠</button>
            <button className="button small-button" onClick={expandAllMessages}>全部展开</button>
            <button className="button small-button" onClick={enableAutoScroll}>滚动到底部</button>
            <label className="auto-refresh-toggle">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={() => setAutoRefresh(!autoRefresh)}
              />
              实时更新
            </label>
            <div className="message-stats">
              {renderExecutionStatus()}
              <span>共 {allThreads.length} 条消息</span>
            </div>
          </div>
        )}
        
        <div className="modal-body" ref={containerRef}>
          {activeTab === 'opinions' && hasOpinions && renderOpinions()}
          {activeTab === 'conversations' && renderConversation()}
          {activeTab === 'raw' && renderRawMessages()}
        </div>
      </div>
    </div>
  );
});

export default ThreadViewer; 