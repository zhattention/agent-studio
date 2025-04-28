'use client';

import React, { useState, useRef, useEffect } from 'react';
import { streamCallTeam } from '../services/api';
import { log } from 'console';
import { rootStore } from '@/stores/StoreContext';

interface StreamingTeamCallProps {
  teamName: string;
  content?: string;
  fullMessage?: boolean; 
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
  autoStart?: boolean;
}

const StreamingTeamCall: React.FC<StreamingTeamCallProps> = ({ 
  teamName, 
  content = "", 
  fullMessage = true,
  onComplete,
  onError,
  autoStart = false
}) => {
  // 状态管理
  const [status, setStatus] = useState<'idle' | 'connecting' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lastActivity, setLastActivity] = useState<string>('');
  const [heartbeats, setHeartbeats] = useState<string[]>([]);
  const [showAllHeartbeats, setShowAllHeartbeats] = useState<boolean>(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressEndRef = useRef<HTMLDivElement>(null);
  
  // 定义不同状态对应的颜色
  const statusColorMap = {
    idle: 'text-gray-600',
    connecting: 'text-blue-600',
    processing: 'text-amber-600',
    completed: 'text-emerald-600',
    error: 'text-rose-600'
  };
  
  // 状态显示文本映射
  const statusTextMap = {
    idle: '待机中',
    connecting: '正在连接...',
    processing: '处理中...',
    completed: '已完成',
    error: '发生错误'
  };

  // 开始调用
  const startCall = async () => {
    if (status === 'processing') return;
    
    // 重置状态
    setStatus('connecting');
    setProgress([]);
    setResult('');
    setError('');
    setHeartbeats([]);
    setLastActivity('');
    
    // 创建 AbortController 用于取消请求
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      await streamCallTeam(
        teamName, 
        content,
          (message) => {
            setProgress(prev => [...prev, message.message]);
            const now = new Date().toLocaleTimeString();
            setLastActivity(now);
            
            // 检查是否是心跳消息
            if (message.status === 'heartbeat') {
              console.log("heartbeat", message);
            }
          },
          (data) => {
            setStatus('completed');
            setResult(JSON.stringify(data, null, 2));
            setProgress(prev => [...prev, '处理完成']);
            if (onComplete) onComplete(data);
          },
          (err) => {
            setStatus('error');
            // setError(err.message || '未知错误');
            // setProgress(prev => [...prev, `错误: ${err.message || '未知错误'}`]);
            // if (onError) onError(err);
          },
        fullMessage,
      );
      rootStore.threadStore.showThreadViewer = true;
    } catch (err: any) {
      console.log("err", err);
      // 只有当不是用户主动取消时才设置错误
      if (err.name !== 'AbortError') {
        setStatus('error');
        setError(err.message || '未知错误');
        setProgress(prev => [...prev, `错误: ${err.message || '未知错误'}`]);
        if (onError) onError(err);
      }
    }
  };
  
  // 取消调用
  const cancelCall = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus('idle');
      setProgress(prev => [...prev, '用户取消了请求']);
    }
  };
  
  // 切换心跳历史显示
  const toggleHeartbeats = () => {
    setShowAllHeartbeats(prev => !prev);
  };
  
  // 自动滚动到最新进度
  useEffect(() => {
    if (progressEndRef.current) {
      progressEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress]);
  
  // 自动启动调用
  useEffect(() => {
    if (autoStart) {
      startCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);
  
  return (
    <div className="streaming-call-container">
      <div className="streaming-call-header">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className={`status-indicator ${statusColorMap[status]}`}>
              <span className="status-dot"></span>
              <span className="status-text">{statusTextMap[status]}</span>
            </div>
            {lastActivity && (
              <div className="last-activity ml-4">
                <span className="text-xs">
                  最后活动: {lastActivity}
                  {heartbeats.length > 0 && (
                    <button 
                      onClick={toggleHeartbeats}
                      className="text-xs ml-2 underline text-primary-color"
                    >
                      {showAllHeartbeats ? '隐藏心跳历史' : '显示心跳历史'}
                    </button>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="streaming-call-actions">
            {status === 'idle' && (
              <button 
                onClick={startCall}
                className="button small-button primary-button"
              >
                启动
              </button>
            )}
            {(status === 'connecting' || status === 'processing') && (
              <button 
                onClick={cancelCall}
                className="button small-button cancel-button"
                style={{ backgroundColor: 'var(--error-color)' }}
              >
                取消
              </button>
            )}
            {(status === 'completed' || status === 'error') && (
              <button 
                onClick={startCall}
                className="button small-button"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                重新调用
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 心跳历史记录 */}
      {showAllHeartbeats && heartbeats.length > 0 && (
        <div className="heartbeat-history mb-3 p-2 bg-gray-50 rounded text-sm">
          <div className="text-xs font-semibold mb-1 text-primary-color">
            心跳历史 ({heartbeats.length} 次, 总处理时间约 {heartbeats.length * 10} 秒)
          </div>
          <ul className="list-none p-0 m-0">
            {heartbeats.map((hb, idx) => (
              <li key={idx} className="py-1 border-b border-gray-100 last:border-0 flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-primary-color mr-2"></span>
                {hb}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* 进度显示区域 */}
      {progress.length > 0 && (
        <div className="progress-area">
          <div className="progress-messages">
            {progress.map((message, index) => (
              <div key={index} className="progress-message">
                {message}
              </div>
            ))}
            <div ref={progressEndRef} />
          </div>
        </div>
      )}
      
      {/* 错误显示 */}
      {status === 'error' && (
        <div className="error-message text-rose-600">
          <strong>错误:</strong> {error}
        </div>
      )}
      
      <style jsx>{`
        .streaming-call-container {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
          background-color: white;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          font-weight: 500;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 6px;
          background-color: currentColor;
        }
        
        .progress-area {
          margin-top: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 0.75rem;
          max-height: 300px;
          overflow-y: auto;
          background-color: #f9f9f9;
        }
        
        .progress-message {
          padding: 0.25rem 0;
          font-size: 0.875rem;
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .progress-message:not(:last-child) {
          border-bottom: 1px dotted #e0e0e0;
        }
        
        .error-message {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 4px;
          background-color: rgba(254, 226, 226, 0.5);
          border: 1px solid rgba(254, 202, 202, 0.7);
        }
        
        .result-area {
          margin-top: 0.5rem;
        }
        
        .result-content {
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background-color: #f9f9f9;
          word-break: break-word;
        }
        
        .primary-button {
          background-color: var(--primary-color);
        }
        
        .primary-button:hover {
          background-color: var(--secondary-color);
        }
        
        .cancel-button:hover {
          background-color: #d32f2f !important;
        }
        
        .text-primary-color {
          color: var(--primary-color);
        }
      `}</style>
    </div>
  );
};

export default StreamingTeamCall; 