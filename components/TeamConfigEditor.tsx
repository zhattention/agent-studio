'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { TeamConfig } from '../types';
import { useStore } from '../stores/StoreContext';
import { observer } from 'mobx-react-lite';

export const TeamConfigEditor = observer(() => {
  const { configStore } = useStore();
  const config = configStore.teamConfig;
  
  const [teamData, setTeamData] = useState<TeamConfig>({ ...config });
  
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
      
      <div className="form-group mt-3">
        <div className="json-view">
          {JSON.stringify(config, null, 2)}
        </div>
      </div>
    </div>
  );
}); 