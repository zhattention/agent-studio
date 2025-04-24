'use client';

import React, { useCallback, useState, useEffect, ChangeEvent } from 'react';
import { useStore } from '../stores/StoreContext';
import { observer } from 'mobx-react-lite';
import { TeamSelector } from './TeamSelector';
import { getConfigFiles } from '../services/api';
import { FileInfo } from '../types';
import { TOOL_DESCRIPTIONS } from './constants';

// 新增的长文本编辑模态框组件
interface LargeTextEditorProps {
  initialText: string;
  title: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

const LargeTextEditor: React.FC<LargeTextEditorProps> = ({ initialText, title, onSave, onClose }) => {
  const [text, setText] = useState(initialText);

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-text-editor" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-actions">
            <button className="button primary-button save-button" onClick={handleSave}>
             Confirm
            </button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          <textarea 
            className="large-text-area"
            value={text} 
            onChange={(e) => setText(e.target.value)}
            placeholder="在这里输入详细的 prompt..."
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};

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
  const { nodeStore } = useStore();
  const node = nodeStore.selectedNode;
  
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [configFiles, setConfigFiles] = useState<FileInfo[]>([]);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState<string>("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showTransitionPromptEditor, setShowTransitionPromptEditor] = useState(false);
  
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
    const { name, value } = e.target;
    
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
  
  if (node.type === 'agent') {
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
      </div>
    );
  }
  
  return <div>Unknown node type</div>;
});