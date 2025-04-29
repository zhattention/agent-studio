import { makeAutoObservable } from 'mobx';
import { saveConfig } from '../services/api';
import { IRootStore, NodeData } from './NodeStore';
import { 
  Node, 
} from 'reactflow';
import { AgentConfig, TeamConfig } from '@/types';
import { buildTeamConfigFromNodes, cleanConfigForSave } from '../services/node';

// Default team config
const defaultTeamConfig: TeamConfig = {
  name: "new_team",
  team_type: "round_robin",
  team_prompt: "",
  agents: [],
  duration: 0
};

export class ConfigStore {
  teamConfig: TeamConfig = { ...defaultTeamConfig };
  
  rootStore: IRootStore;

  constructor(rootStore: IRootStore) {
    this.rootStore = rootStore;
    
    makeAutoObservable(this, {
      rootStore: false
    });
  }
  
  setTeamConfig = (config: TeamConfig) => {
    console.log('[ConfigStore] 设置团队配置:', config);
    this.teamConfig = config;
  };
} 