'use client';

import React, { useCallback, useState, useEffect, ChangeEvent } from 'react';
import { readPromptPath } from '../services/api';
import { AgentNode, TeamNode } from '../types';
import { useStore } from '../stores/StoreContext';
import { observer } from 'mobx-react-lite';

interface NodeEditorProps {
  availableTools: string[];
  availableModels: string[];
}

export const NodeEditor = observer(({ availableTools, availableModels }: NodeEditorProps) => {
  const { nodeStore } = useStore();
  const node = nodeStore.selectedNode;
  
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  
  // 如果没有选中节点，不渲染任何内容
  if (!node) return null;
  
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
            value={node.data.model || availableModels[0]} 
            onChange={handleChange}
          >
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Tools:</label>
          <div className="tools-list">
            {availableTools.map(tool => (
              <div key={tool} className="tool-item">
                <input 
                  type="checkbox" 
                  id={`tool-${tool}`}
                  checked={(node.data.tools || []).includes(tool)} 
                  onChange={() => handleToolChange(tool)} 
                />
                <label htmlFor={`tool-${tool}`}>{tool}</label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <label>
            Prompt:
         </label>
          <textarea 
            name="prompt" 
            value={node.data.prompt || ""} 
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label>Transition Prompt:</label>
          <textarea 
            name="transition_prompt" 
            value={node.data.transition_prompt || ""} 
            onChange={handleChange}
          />
        </div>
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