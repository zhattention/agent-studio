'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AgentConfig } from '../types';

interface AgentNodeProps extends NodeProps {
  data: AgentConfig;
  selected: boolean;
}

export function AgentNode({ data, selected }: AgentNodeProps) {
  return (
    <div className={`node node-agent ${selected ? 'selected' : ''}`}>
      {/* 顶部连接点（入口） */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        title="连接目标（接收输入）"
        className="agent-handle agent-handle-target"
      />
      
      <div className="node-header">{data.name}</div>
      <div className="node-type">Agent</div>
      <div>Model: {data.model}</div>
      <div>Tools: {data.tools?.length > 0 ? data.tools.join(', ') : 'None'}</div>
      
      {/* 底部连接点（出口） */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        title="连接源（发送输出）"
        className="agent-handle agent-handle-source"
      />
      
      {/* 右侧连接点 （辅助出口）*/}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        title="分支连接源" 
        className="agent-handle agent-handle-side" 
      />
      
      {/* 左侧连接点 （辅助入口）*/}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        title="分支连接目标"
        className="agent-handle agent-handle-side" 
      />
    </div>
  );
} 