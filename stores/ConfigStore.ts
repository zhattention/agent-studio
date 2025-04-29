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
  
  // 从节点数据更新agents数组
  updateAgentsFromNodes = (agentsData: any[]) => {
    console.log('[ConfigStore] 开始从节点数据重建团队配置树', { agentsDataCount: agentsData.length });
    
    // 使用提取出的服务函数重建配置
    const allNodes = this.rootStore.nodeStore.nodes;
    const allEdges = this.rootStore.nodeStore.edges;
    
    // 使用新的服务函数
    this.teamConfig = buildTeamConfigFromNodes(
      allNodes,
      allEdges,
      this.teamConfig
    );
    
    console.log('[ConfigStore] 完成配置更新', {
      teamName: this.teamConfig.name,
      agentsCount: this.teamConfig.agents.length
    });
  };
  
  // 保存配置到服务器
  saveTeamConfig = async (): Promise<boolean> => {
    try {
      console.log('[ConfigStore] 开始保存团队配置');
      
      // 使用 rootStore 的手动同步方法，从节点数据重建配置树
      this.rootStore.manualSync();
      console.log('[ConfigStore] 已完成从节点到配置的手动同步');
      
      // 确保团队名称有效
      if (!this.teamConfig.name || this.teamConfig.name.trim() === '') {
        console.warn('[ConfigStore] 团队名称为空，设置为默认名称');
        this.teamConfig.name = `team_${new Date().getTime()}`;
      }
      
      // 清理配置，移除不必要的字段
      const cleanedConfig = cleanConfigForSave(this.teamConfig);
      
      console.log('[ConfigStore] 准备保存团队配置到服务器:', { 
        teamName: cleanedConfig.name,
        agentsCount: cleanedConfig.agents?.length || 0
      });
      
      // 保存到服务器
      const response = await saveConfig(cleanedConfig.name, cleanedConfig);
      
      if (response.success) {
        console.log(`[ConfigStore] 团队配置保存成功: ${response.path}`);
        // 更新保存时间戳
        this.teamConfig = {
          ...this.teamConfig,
          _lastSaved: new Date().toISOString()
        };
        return true;
      }
      
      console.error(`[ConfigStore] 团队配置保存失败: ${response.error || '未知错误'}`);
      return false;
    } catch (error) {
      console.error('[ConfigStore] 保存团队配置出错:', error);
      return false;
    }
  };
} 