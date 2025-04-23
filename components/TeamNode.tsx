'use client';

import React, { CSSProperties } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { TeamData } from '../types';

interface TeamNodeProps extends NodeProps {
  data: TeamData;
  selected: boolean;
}

export function TeamNode({ data, selected }: TeamNodeProps) {
  return (
    <div className={`node node-team ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        title="来自上级连接"
        className="team-handle team-handle-target"
        style={{ visibility: 'hidden' } as CSSProperties} // 通常隐藏，因为team节点一般是起点
      />
      
      <div className="node-header">{data.name}</div>
      <div className="node-content">
        <div className="node-type">Team</div>
        <div className="node-property">
          <span className="property-label">Type:</span> 
          <span className="property-value">{data.team_type}</span>
        </div>
        {data.agentCount !== undefined && (
          <div className="node-property">
            <span className="property-label">Agents:</span> 
            <span className="property-value">{data.agentCount}</span>
          </div>
        )}
      </div>
      
      {/* 主要出口连接点 */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        title="连接到团队的第一个Agent"
        className="team-handle team-handle-source"
        style={{ width: '12px', height: '12px' } as CSSProperties} // 稍大一些，更容易点击
      />
      
      {/* 备用侧面连接点 */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        title="侧面连接到Agent"
        className="team-handle team-handle-side"
      />
    </div>
  );
} 