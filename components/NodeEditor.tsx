'use client';

import React, { useCallback, useState, useEffect, ChangeEvent } from 'react';
import { useStore } from '../stores/StoreContext';
import { observer } from 'mobx-react-lite';
import { TeamSelector } from './TeamSelector';
import { getConfigFiles, callTeam, saveConfig } from '../services/api';
import { AgentConfig, FileInfo, TeamConfig } from '../types';
import { TOOL_DESCRIPTIONS } from './constants';
import LargeTextEditor from './LargeTextEditor';
import StreamingTeamCall from './StreamingTeamCall';
import ThreadViewer from './ThreadViewer';
import { saveTeamNodeConfig } from '../services/node';
import { log } from 'console';

interface ToolDetailsModalProps {
  tool: string;
  onClose: () => void;
}

// Tool details modal component
const ToolDetailsModal: React.FC<ToolDetailsModalProps> = ({ tool, onClose }) => {
  const toolInfo = TOOL_DESCRIPTIONS[tool];
  
  if (!toolInfo) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tool-details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{toolInfo.name}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="tool-modal-description">{toolInfo.description}</p>
          
          {toolInfo.args && Object.keys(toolInfo.args).length > 0 && (
            <>
              <h4>参数:</h4>
              <ul className="tool-args-list">
                {Object.entries(toolInfo.args).map(([argName, argDesc]) => (
                  <li key={argName}>
                    <strong>{argName}</strong>: {String(argDesc)}
                  </li>
                ))}
              </ul>
            </>
          )}
          
          {toolInfo.returns && (
            <>
              <h4>返回值:</h4>
              <p>{toolInfo.returns}</p>
            </>
          )}
          
          {toolInfo.notes && (
            <>
              <h4>注意事项:</h4>
              <p>{toolInfo.notes}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface NodeEditorProps {
  availableTools: string[];
  availableModels: { id: string, description: string }[];
}

export const NodeEditor = observer(({ availableTools, availableModels }: NodeEditorProps) => {
  const { nodeStore, uiStore, threadStore, configStore } = useStore();
  const node = nodeStore.selectedNode;
  
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [configFiles, setConfigFiles] = useState<FileInfo[]>([]);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState<string>("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showTransitionPromptEditor, setShowTransitionPromptEditor] = useState(false);
  
  // 添加团队运行相关状态
  const [teamContent, setTeamContent] = useState('');
  const [teamResponse, setTeamResponse] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showResponseViewer, setShowResponseViewer] = useState(false);
  
  // 添加使用流式响应的状态
  const [useStreaming, setUseStreaming] = useState(true);
  
  // 如果没有选中节点，不渲染任何内容
  if (!node) return null;
  
  // 过滤工具列表
  const filteredTools = availableTools.filter(tool => 
    tool.toLowerCase().includes(toolFilter.toLowerCase()) || 
    (TOOL_DESCRIPTIONS[tool]?.description || "").toLowerCase().includes(toolFilter.toLowerCase())
  );
  
  // 加载可用的团队配置文件
  useEffect(() => {
    const loadConfigFiles = async () => {
      try {
        const files = await getConfigFiles();
        setConfigFiles(files);
      } catch (error) {
        console.error('Failed to load config files:', error);
      }
    };
    
    loadConfigFiles();
  }, []);
  
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let value: string | boolean;
    
    // 如果是复选框，使用 checked 值
    if (e.target.type === 'checkbox') {
      value = (e.target as HTMLInputElement).checked;
    } else {
      value = e.target.value;
    }
    
    // 直接更新nodeStore中的节点数据
    nodeStore.updateNodeData(node.id, {
      [name]: value
    });
  }, [node, nodeStore]);
  
  const handleToolChange = (tool: string) => {
    let updatedTools = node.data.tools || [];
    
    if (updatedTools.includes(tool)) {
      updatedTools = updatedTools.filter(t => t !== tool);
    } else {
      updatedTools = [...updatedTools, tool];
    }
    
    // 直接更新nodeStore中的节点数据
    nodeStore.updateNodeData(node.id, {
      tools: updatedTools
    });
  };
  
  // 处理团队选择
  const handleTeamSelect = (filePath: string) => {
    // 从文件路径中提取团队名称（去掉configs/和.json部分）
    const teamName = filePath.replace(/^configs\//, '').replace(/\.json$/, '');
    
    // 更新节点数据
    nodeStore.updateNodeData(node.id, {
      team_call: teamName
    });
    
    // 关闭选择器
    setShowTeamSelector(false);
  };
  
  const openToolDetails = (tool: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTool(tool);
  };
  
  const handleTeamContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTeamContent(e.target.value);
  };
  
  // 处理流式调用完成
  const handleStreamComplete = useCallback((data: any) => {
    setTeamResponse(data);
    setShowResponseViewer(true);
    uiStore.showNotification('success', `team ${node.data.name} 运行完成`, 3000);
  }, [node.data.name, uiStore]);
  
  // 处理流式调用错误
  const handleStreamError = (error: any) => {
    console.error('运行团队出错:', error);
    uiStore.showNotification('error', 
      `运行失败: ${error instanceof Error ? error.message : String(error)}`, 5000);
  };
  
  // 常规团队调用方法
  const startTeam = async () => {
    if (!node || node.type !== 'team' || !node.data.name) {
      uiStore.showNotification('error', '无效的团队节点', 3000);
      return;
    }
    
    try {
      setIsRunning(true);
      setTeamResponse(null);
      uiStore.showNotification('info', `正在运行团队 ${node.data.name}，可能需要一些时间...`, 5000);
      
      const response = await callTeam(node.data.name, teamContent);
      if (response.status !== 'success') {
        throw new Error(response.error);
      }
      
      setTeamResponse(JSON.stringify(response.result, null, 2));
      uiStore.showNotification('success', `团队 ${node.data.name} 运行完成`, 3000);
      setShowResponseViewer(true);
    } catch (error) {
      console.error('运行团队出错:', error);
      uiStore.showNotification('error', 
        `运行失败: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      setIsRunning(false);
    }
  };
  
  // 查看完整响应
  const viewFullResponse = useCallback(() => {
    threadStore.setShowThreadViewer(true);
  }, [threadStore]);
  
  // 添加团队保存处理函数
  const handleSaveTeamConfig = async () => {
    if (!node || node.type !== 'team' || !node.id) {
      uiStore.showNotification('error', '无效的团队节点', 3000);
      return;
    }
    
    try {
      uiStore.showNotification('info', `正在保存团队 ${node.data.name} 配置...`, 3000);
      
      // 调用新服务中的保存函数
      const teamConfig = await saveTeamNodeConfig(
        node.id,
        nodeStore.nodes,
        nodeStore.edges,
        configStore.teamConfig,
      );

      console.log('[NodeEditor] 保存团队配置:', JSON.stringify(teamConfig, null, 2));

      if (teamConfig) {
        await saveConfig(teamConfig.name, teamConfig);
        uiStore.showNotification('success', `团队 ${node.data.name} 配置已保存`, 3000);
      } else {
        uiStore.showNotification('error', `保存团队 ${node.data.name} 配置失败`, 3000);
      }

    } catch (error) {
      console.error('保存团队配置出错:', error);
      uiStore.showNotification('error', 
        `保存失败: ${error instanceof Error ? error.message : String(error)}`, 5000);
    }
  };
  
  if (node.type === 'agent') {
    const nodeData = node.data as AgentConfig;
    return (
      <div className="editor-form">
        <div className="form-group">
          <label>Name:</label>
          <input 
            type="text" 
            name="name" 
            value={node.data.name || ""} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="form-group">
          <label>Model:</label>
          <select 
            name="model" 
            value={node.data.model || (availableModels[0]?.id || "")} 
            onChange={handleChange}
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>{model.id} - {model.description}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>
            Tools:
            {(node.data.tools || []).length > 0 && (
              <span className="selected-tools-count">
                已选 {(node.data.tools || []).length}
              </span>
            )}
          </label>
          <div className="tools-filter">
            <input
              type="text"
              placeholder="搜索工具..."
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="tool-search-input"
            />
            {toolFilter && (
              <button 
                className="clear-filter-button"
                onClick={() => setToolFilter("")}
                title="清除过滤"
              >
                ✕
              </button>
            )}
          </div>
          <div className="tools-count">
            {filteredTools.length} / {availableTools.length} 工具
            {toolFilter && ` (搜索: "${toolFilter}")`}
          </div>
          <div className="tools-list" style={{ height: '200px', overflowY: 'auto' }}>
            {filteredTools.map(tool => (
              <div key={tool} className="tool-item">
                <input 
                  type="checkbox" 
                  id={`tool-${tool}`}
                  checked={(node.data.tools || []).includes(tool)} 
                  onChange={() => handleToolChange(tool)} 
                />
                <div className="tool-content">
                  <div className="tool-header">
                    <label htmlFor={`tool-${tool}`} className="tool-name">
                      {tool}
                    </label>
                    <button 
                      className="info-button"
                      onClick={(e) => openToolDetails(tool, e)}
                    >
                      ℹ️
                    </button>
                  </div>
                  <div className="tool-description">
                    {TOOL_DESCRIPTIONS[tool]?.description || ""}
                  </div>
                </div>
              </div>
            ))}
            {filteredTools.length === 0 && (
              <div className="no-tools-found">
                没有找到匹配 "{toolFilter}" 的工具
              </div>
            )}
          </div>
        </div>

        <div className='form-group'>
          <label>Force Tool Call:</label>
          <div className="force-tool-section">
            <select
              name="force_tool_call"
              value={node.data.force_tool_call || ""}
              onChange={handleChange}
              style={{ marginBottom: '10px', width: '100%' }}
            >
              <option value="">No forced tool call</option>
              {(node.data.tools || []).map(tool => (
                <option key={tool} value={tool}>{tool}</option>
              ))}
            </select>
            
            {node.data.force_tool_call && (
              <div className="force-tool-args">
                <label>Force Tool Arguments:</label>
                <div className="args-editor">
                  {Object.entries(TOOL_DESCRIPTIONS[node.data.force_tool_call]?.args || {}).map(([argName, argDesc]) => (
                    <div key={argName} className="arg-item">
                      <label>{argName}:</label>
                      <div className="arg-config">
                        <select
                          value={node.data.force_tool_args?.[argName]?.type || "value"}
                          onChange={(e) => {
                            const newArgs = {
                              ...node.data.force_tool_args,
                              [argName]: {
                                type: e.target.value,
                                value: ""
                              }
                            };
                            nodeStore.updateNodeData(node.id, { force_tool_args: newArgs });
                          }}
                        >
                          <option value="value">Direct Value</option>
                          <option value="history_grab">History Grab</option>
                          <option value="xml_grab">XML Grab</option>
                        </select>
                        
                        <input
                          type="text"
                          autoComplete="on"
                          value={node.data.force_tool_args?.[argName]?.value || ""}
                          onChange={(e) => {
                            let value: string | number;
                            if (node.data.force_tool_args?.[argName]?.type === "history_grab") {
                              value = parseInt(e.target.value);
                            } else {
                              value = e.target.value;
                            }

                            const newArgs = {
                              ...node.data.force_tool_args,
                              [argName]: {
                                type: node.data.force_tool_args?.[argName]?.type || "value",
                                value: value
                              }
                            };
                            nodeStore.updateNodeData(node.id, { force_tool_args: newArgs });
                          }}
                          placeholder={
                            node.data.force_tool_args?.[argName]?.type === "history_grab" 
                              ? "Enter history index" 
                              : node.data.force_tool_args?.[argName]?.type === "xml_grab"
                                ? "Enter XML tag name"
                                : "Enter value"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Team Call:</label>
          <div className="team-call-selector">
            <input 
              type="text" 
              name="team_call_display" 
              value={node.data.team_call || ""}
              readOnly
              placeholder="点击选择团队"
              style={{ cursor: 'pointer', width: 'calc(100% - 140px)' }}
              onClick={() => setShowTeamSelector(true)}
            />
            <button 
              className="button small-button" 
              onClick={() => setShowTeamSelector(true)}
              style={{ marginLeft: '5px' }}
            >
              选择团队
            </button>
            
            {node.data.team_call && (
              <button 
                className="button small-button" 
                onClick={() => nodeStore.updateNodeData(node.id, { team_call: "" })}
                style={{ marginLeft: '5px' }}
              >
                清除
              </button>
            )}
          </div>
          <small className="help-text">选择此代理将调用的子团队。代理可以将其输出传递给另一个团队进行处理。</small>
        </div>
        
        <div className="form-group">
          <label>Team Call Tag:</label>
          <input
            type="text"
            name="team_call_tag"
            value={node.data.team_call_tag || ""}
            onChange={handleChange}
            placeholder="可选的团队调用标签"
          />
          <small className="help-text">可选标签，用于团队调用时传递额外参数。</small>
        </div>

        <div className='form-group'>
          <label>Full Message:</label>
          <input 
            type="checkbox" 
            name="full_message" 
            checked={node.data.full_message || false} 
            onChange={handleChange}
          />
          <small className="help-text">当为true时，团队将返回完整消息，否则返回最后一条消息</small>
        </div>
        
        <div className="form-group">
          <div className="form-group-header">
            <label>Prompt:</label>
            <button 
              className="button small-button expand-button" 
              onClick={() => setShowPromptEditor(true)}
              title="展开编辑器"
            >
              <span className="expand-icon">⤢</span> 展开编辑器
            </button>
          </div>
          <textarea 
            name="prompt" 
            value={node.data.prompt || ""} 
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <div className="form-group-header">
            <label>Transition Prompt:</label>
            <button 
              className="button small-button expand-button" 
              onClick={() => setShowTransitionPromptEditor(true)}
              title="展开编辑器"
            >
              <span className="expand-icon">⤢</span> 展开编辑器
            </button>
          </div>
          <textarea 
            name="transition_prompt" 
            value={node.data.transition_prompt || ""} 
            onChange={handleChange}
          />
        </div>
        
        {/* Tool details modal */}
        {selectedTool && (
          <ToolDetailsModal 
            tool={selectedTool} 
            onClose={() => setSelectedTool(null)} 
          />
        )}
        
        {/* 团队选择器模态框 */}
        {showTeamSelector && (
          <TeamSelector
            teams={configFiles}
            onSelect={handleTeamSelect}
            onClose={() => setShowTeamSelector(false)}
          />
        )}
        
        {/* Prompt 编辑器模态框 */}
        {showPromptEditor && (
          <LargeTextEditor
            initialText={node.data.prompt || ""}
            title="编辑 Prompt"
            onSave={(text) => {
              nodeStore.updateNodeData(node.id, { prompt: text });
            }}
            onClose={() => setShowPromptEditor(false)}
          />
        )}
        
        {/* Transition Prompt 编辑器模态框 */}
        {showTransitionPromptEditor && (
          <LargeTextEditor
            initialText={node.data.transition_prompt || ""}
            title="编辑 Transition Prompt"
            onSave={(text) => {
              nodeStore.updateNodeData(node.id, { transition_prompt: text });
            }}
            onClose={() => setShowTransitionPromptEditor(false)}
          />
        )}
      </div>
    );
  } else if (node.type === 'team') {
    const nodeData = node.data as TeamConfig;
    return (
      <div className="editor-form">
        <div className="form-group">
          <label>Team Name:</label>
          <input 
            type="text" 
            name="name" 
            value={node.data.name || ""} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="form-group">
          <label>Team Type:</label>
          <select 
            name="team_type" 
            value={nodeData.team_type || "round_robin"} 
            onChange={handleChange}
          >
            <option value="round_robin">round_robin</option>
            <option value="tree">tree</option>
            <option value="parallel">parallel</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Team Prompt:</label>
          <textarea 
            name="team_prompt" 
            value={nodeData.team_prompt || ""} 
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label>Duration (seconds):</label>
          <input 
            type="number" 
            name="duration" 
            value={nodeData.duration || 0} 
            onChange={handleChange} 
          />
          <small>0 for one-time execution, -1 for continuous, or seconds between executions</small>
        </div>
        <div className="form-group">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              name="full_message" 
              checked={nodeData.full_message || false} 
              onChange={handleChange}
              className="mr-2"
            />
            <label className="mb-0">Return Full Message:</label>
          </div>
          <small>when true, the team will return the full message, otherwise it will return the last message</small>
        </div>
        
        {/* 添加保存团队配置按钮 */}
        <div className="form-group">
          <button 
            className="button primary" 
            onClick={handleSaveTeamConfig}
            style={{ marginBottom: '20px' }}
          >
            保存团队 "{node.data.name}" 配置
          </button>
          <small className="help-text">点击保存当前团队的配置，将基于当前节点图构建配置树</small>
        </div>
        
        {/* 添加响应模式选择 */}
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={() => setUseStreaming(!useStreaming)}
            />
            使用流式响应 (实时显示进度)
          </label>
        </div>
        
        {/* 基于选择的响应模式显示不同组件 */}
        {useStreaming ? (
          <div className="form-group mt-4">
            <div className="team-run-panel">
              <h3>运行团队 (流式响应)</h3>
              <textarea
                placeholder="输入要发送给团队的内容... (可选，留空则发送空内容)"
                value={teamContent}
                onChange={handleTeamContentChange}
                className="team-content-input mb-3"
                rows={4}
              />
              
              {/* 流式团队调用组件 */}
              <StreamingTeamCall
                teamName={node.data.name}
                content={teamContent}
                onComplete={handleStreamComplete}
                onError={handleStreamError}
              />
            </div>
          </div>
        ) : (
          /* 原始团队运行面板 */
          <div className="form-group mt-4">
            <div className="team-run-panel">
              <h3>运行团队</h3>
              <textarea
                placeholder="输入要发送给团队的内容... (可选，留空则发送空内容)"
                value={teamContent}
                onChange={handleTeamContentChange}
                className="team-content-input"
                rows={4}
                disabled={isRunning}
              />
              <small className="help-text">可以留空，将使用空字符串作为输入内容</small>
              <button 
                className={`button ${isRunning ? 'loading' : 'primary'}`}
                onClick={startTeam}
                disabled={isRunning}
                style={{ marginTop: '10px', width: '100%' }}
              >
                {isRunning ? '运行中...' : `Start Team "${node.data.name}"`}
              </button>
            </div>
          </div>
        )}
        
        {/* 添加结果显示区域 (仅在非流式模式下显示) */}
        {!useStreaming && teamResponse && (
          <div className="form-group mt-3">
            <div className="form-group-header">
              <h3>运行结果</h3>
              <button 
                className="button small-button expand-button" 
                onClick={viewFullResponse}
                title="查看完整结果"
              >
                <span className="expand-icon">⤢</span> 查看完整结果
              </button>
            </div>
            <div className="team-response">
              <pre>
                {teamResponse.length > 500 
                  ? `${teamResponse.slice(0, 500)}... (点击"查看完整结果"按钮查看全部内容)` 
                  : teamResponse}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return <div>Unknown node type</div>;
});