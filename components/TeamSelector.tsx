'use client';

import React, { useState, ChangeEvent } from 'react';
import { FileInfo } from '../types';

interface TeamSelectorProps {
  teams: FileInfo[];
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function TeamSelector({ teams, onSelect, onClose }: TeamSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // 格式化团队名称 - 移除.json后缀
  const formatTeamName = (name: string): string => {
    return name.replace(/\.json$/, '');
  };
  
  const filteredTeams = teams.filter(team => 
    formatTeamName(team.name).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="file-selector-overlay">
      <div className="file-selector">
        <div className="file-selector-header">
          <h2>选择团队</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="file-selector-search">
          <input
            type="text"
            placeholder="搜索团队..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="file-list">
          {filteredTeams.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>大小</th>
                  <th>修改时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => (
                  <tr key={team.path}>
                    <td>{formatTeamName(team.name)}</td>
                    <td>{formatSize(team.size)}</td>
                    <td>{formatDate(team.modified)}</td>
                    <td>
                      <button 
                        className="button small-button"
                        onClick={() => onSelect(team.path)}
                      >
                        选择
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-files">
              {searchTerm ? '没有找到匹配的团队。' : '没有可用的团队。请先创建并保存团队配置。'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 