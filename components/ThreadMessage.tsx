import React, { useState, memo, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

type MessageType = {
  id: string;
  role: string;
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
  metadata?: any;
};

interface ThreadMessageProps {
  message: MessageType;
  index: number;
  isCollapsed: boolean;
  toggleMessageCollapse: (id: string) => void;
  getMessagePreview: (message: MessageType) => string;
  getTypeIcon: (role: string) => JSX.Element;
}

const ThreadMessage: React.FC<ThreadMessageProps> = ({
  message,
  index,
  isCollapsed,
  toggleMessageCollapse,
  getMessagePreview,
  getTypeIcon,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  const toggleRawView = useCallback(() => {
    setShowRaw((prev) => !prev);
  }, []);

  const renderToolCalls = useCallback((toolCalls: any[]) => {
    return toolCalls.map((toolCall: any, idx: number) => {
      const functionCall = toolCall.function || {};
      const functionName = functionCall.name || 'Unknown Function';
      
      // Try to parse arguments as JSON for pretty display
      let args;
      try {
        args = JSON.parse(functionCall.arguments || '{}');
      } catch (e) {
        args = functionCall.arguments || {};
      }
      
      return (
        <div key={`${toolCall.id}-${idx}`} className="tool-call">
          <div className="tool-call-header">
            {functionName}
          </div>
          <div className="tool-call-content">
            <SyntaxHighlighter language="json" style={atomDark}>
              {JSON.stringify(args, null, 2)}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    });
  }, []);

  const renderContent = useCallback(() => {
    if (showRaw) {
      return (
        <div className="raw-messages">
          <pre>{JSON.stringify(message, null, 2)}</pre>
        </div>
      );
    }

    if (isCollapsed) {
      return <div className="message-preview">{getMessagePreview(message)}</div>;
    }

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      return (
        <div className="message-content">
          {message.content && (
            <div className="message-text">
                {message.content}
            </div>
          )}
          {renderToolCalls(message.tool_calls)}
        </div>
      );
    }

    // Regular message content
    return (
      <div className="message-content">
          {message.content}
      </div>
    );
  }, [message, isCollapsed, showRaw, getMessagePreview, renderToolCalls]);

  return (
    <div 
      className={`message-bubble ${message.role}`}
      data-testid={`message-${index}`}
    >
      <div className="message-header">
        <div className="message-role">
          {getTypeIcon(message.role)}
          <span>
            {message.role === 'tool' ? 'Tool Result' : 
             message.role === 'function' ? (message.name || 'Function') : 
             message.role.charAt(0).toUpperCase() + message.role.slice(1)}
          </span>
        </div>
        <div className="message-actions">
          <button 
            className="action-btn"
            onClick={() => toggleMessageCollapse(message.id)}
            aria-label={isCollapsed ? "Expand message" : "Collapse message"}
          >
            {isCollapsed ? '▼ Expand' : '▲ Collapse'}
          </button>
          <button 
            className="action-btn"
            onClick={toggleRawView}
            aria-label={showRaw ? "Show formatted view" : "Show raw JSON"}
          >
            {showRaw ? '📝 Formatted' : '🔍 Raw'}
          </button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(ThreadMessage); 