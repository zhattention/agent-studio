'use client';

import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { TeamConfig } from '../types';
import { useStore } from '../stores/StoreContext';
import { observer } from 'mobx-react-lite';
import { callTeam } from '../services/api';
import LargeTextEditor from './LargeTextEditor';
import ThreadViewer from './ThreadViewer';
import { log } from 'console';

export const TeamConfigEditor = observer(() => {
  const { configStore, uiStore, threadStore } = useStore();
  const config = configStore.teamConfig;
  
  const [teamData, setTeamData] = useState<TeamConfig>({ ...config });
  const [isRunning, setIsRunning] = useState(false);
  const [teamContent, setTeamContent] = useState('');
  
  useEffect(() => {
    setTeamData({ ...config });
  }, [config]);
  
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    // Parse duration as number
    if (name === 'duration') {
      parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue)) {
        parsedValue = 0;
      }
    }
    
    setTeamData({ ...teamData, [name]: parsedValue });
  };
  
  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTeamContent(e.target.value);
  };
  
  const startTeam = async () => {
    if (!teamData.name || teamData.name === 'new_team') {
      uiStore.showNotification('error', '请先保存团队配置', 3000);
      return;
    }
    
    try {
      setIsRunning(true);
      uiStore.showNotification('info', `正在运行团队 ${teamData.name}，可能需要一些时间...`, 5000);
      
      const response = await callTeam(teamData.name, teamContent);
      if (response.status !== 'success') {
        throw new Error(response.error);
      }
      if (response.result && typeof response.result === 'object') {
        threadStore.setCurrentExecution(response.result);
      }
      uiStore.showNotification('success', `团队 ${teamData.name} 运行完成`, 3000);
    } catch (error) {
      console.error('运行团队出错:', error);
      uiStore.showNotification('error', 
        `运行失败: ${error instanceof Error ? error.message : String(error)}`, 5000);
    } finally {
      setIsRunning(false);
    }
  };
  
  const viewFullResponse = useCallback(() => {
    threadStore.setShowThreadViewer(true);
  }, [threadStore]);

  return (
    <div className="editor-form">
      <div className="form-group">
        <label>Team Name:</label>
        <input 
          type="text" 
          name="name" 
          value={teamData.name || "new_team"} 
          onChange={handleChange} 
        />
      </div>
      
      <div className="form-group">
        <label>Team Type:</label>
        <select 
          name="team_type" 
          value={teamData.team_type || "round_robin"} 
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
          value={teamData.team_prompt || ""} 
          onChange={handleChange}
        />
      </div>
      
      <div className="form-group">
        <label>Duration (seconds):</label>
        <input 
          type="number" 
          name="duration" 
          value={teamData.duration || 0} 
          onChange={handleChange} 
        />
        <small>0 for one-time execution, -1 for continuous, or seconds between executions</small>
      </div>
      
      <div className="form-group mt-4">
        <div className="team-run-panel">
          <h3>运行团队</h3>
          <textarea
            placeholder="输入要发送给团队的内容... (可选，留空则发送空内容)"
            value={teamContent}
            onChange={handleContentChange}
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
            {isRunning ? '运行中...' : 'Start Team'}
          </button>
        </div>
      </div>
      
      {threadStore.currentExecution && (
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
              {JSON.stringify(threadStore.currentExecution, null, 2).length > 500 
                ? `${JSON.stringify(threadStore.currentExecution, null, 2).slice(0, 500)}... (点击"查看完整结果"按钮查看全部内容)` 
                : JSON.stringify(threadStore.currentExecution, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="form-group mt-3">
        <div className="json-view">
          {JSON.stringify(config, null, 2)}
        </div>
      </div>
    </div>
  );
}); 