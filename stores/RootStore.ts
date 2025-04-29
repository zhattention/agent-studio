import { NodeStore, IRootStore } from './NodeStore';
import { ConfigStore } from './ConfigStore';
import { UIStore } from './UIStore';
import { ThreadStore } from './ThreadStore';
import { reaction } from 'mobx';

export class RootStore implements IRootStore {
  nodeStore: NodeStore;
  configStore: ConfigStore;
  uiStore: UIStore;
  threadStore: ThreadStore;
  
  constructor() {
    this.nodeStore = new NodeStore(this);
    this.configStore = new ConfigStore(this);
    this.uiStore = new UIStore(this);
    this.threadStore = new ThreadStore(this);
    
    // 不再自动设置同步
    // this.setupAutoSync();
  }
  
  // 保留这个方法但默认不调用，以便将来可能需要重新启用
  setupAutoSync() {
    console.log('[RootStore] 设置自动同步 - 注意：此功能当前已禁用');
    
    /*
    // 当节点变化时，更新配置，只在节点数组有效时执行
    // 注意：此功能已禁用，因为会消耗较多资源，现在只在保存时进行同步
    reaction(
      () => {
        // 只在nodes是数组时返回序列化结果
        if (Array.isArray(this.nodeStore.nodes) && this.nodeStore.nodes.length > 0) {
          return this.nodeStore.serializeNodes();
        }
        return null; // 返回null表示没有有效数据
      },
      (nodesData) => {
        // 只在有效数据时进行更新
        if (nodesData) {
          this.configStore.updateAgentsFromNodes(nodesData);
        }
      }
    );
    
    // 当配置的agents变化时，更新节点
    // 这会在实现完ConfigStore后添加
    reaction(
      () => this.configStore.teamConfig.agents,
      (agents) => this.nodeStore.updateNodesFromAgents(agents)
    );
    */
  }
} 