import { loadConfigRecursively } from '@/services/api';
import { log } from 'console';
import { makeAutoObservable } from 'mobx';
import { 
  Node, 
  Edge, 
  ReactFlowInstance, 
  applyNodeChanges, 
  applyEdgeChanges, 
  NodeChange, 
  EdgeChange,
  MarkerType
} from 'reactflow';
import { ThreadStore } from './ThreadStore';
import { AgentConfig, TeamConfig } from '@/types';

// 使用interface代替直接引用，避免循环依赖
export interface IRootStore {
  nodeStore: NodeStore;
  configStore: {
  };
  uiStore: {
    showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string, duration?: number) => void;
  };
  threadStore?: ThreadStore;
}

export type NodeData = AgentConfig | TeamConfig;
export class NodeStore {
  nodes: Node<NodeData>[] = [];
  edges: Edge[] = [];
  selectedNode: Node<NodeData> | null = null;
  selectedNodes: Node<NodeData>[] = [];
  reactFlowInstance: ReactFlowInstance | null = null;
  
  rootStore: IRootStore;

  constructor(rootStore: IRootStore) {
    this.rootStore = rootStore;
    
    makeAutoObservable(this, {
      rootStore: false
    });
  }
  
  setNodes = (nodes: Node[] | any) => {
    // 添加详细日志
    
    if (Array.isArray(nodes)) {
      
      if (nodes.length > 0) {
        
      }
    }
    
    // 如果是函数，执行它并传入当前nodes
    if (typeof nodes === 'function') {
      try {
        const result = nodes(this.nodes);
        
        
        // 确保结果是数组
        if (Array.isArray(result)) {
          this.nodes = result;
          
        } else {
          console.warn('Function returned non-array:', result);
          // 保持当前状态
        }
      } catch (error) {
        console.error('Error executing nodes function:', error);
      }
    }
    // 如果是数组，直接使用
    else if (Array.isArray(nodes)) {
      this.nodes = nodes;
      
    } else {
      console.warn('NodeStore.setNodes received invalid input of type:', typeof nodes);
      // 不更改当前状态
    }
  };
  
  setEdges = (edges: Edge[] | any) => {
    // 如果是函数，执行它并传入当前edges
    if (typeof edges === 'function') {
      try {
        const result = edges(this.edges);
        
        // 确保结果是数组
        if (Array.isArray(result)) {
          this.edges = result;
          
        } else {
          console.warn('Function returned non-array:', result);
          // 保持当前状态
        }
      } catch (error) {
        console.error('Error executing edges function:', error);
      }
    }
    // 如果是数组，直接使用
    else if (Array.isArray(edges)) {
      this.edges = edges;
      
    } else {
      console.warn('NodeStore.setEdges received invalid input:', edges);
      // 不更改当前状态
    }

    this.edges.forEach(edge => {
      edge.markerEnd = {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: '#888'
      }
    });
  };
  
  onNodesChange = (changes: NodeChange[]) => {
    // 确保changes和this.nodes都是数组
    if (!Array.isArray(changes) || !Array.isArray(this.nodes)) {
      console.warn('onNodesChange: Invalid input or state', { 
        changes: Array.isArray(changes), 
        nodes: Array.isArray(this.nodes) 
      });
      return;
    }
    
    this.nodes = applyNodeChanges(changes, this.nodes);
    
    // 如果存在remove操作，检查是否影响到selectedNode
    const removedIds = changes
      .filter(change => change.type === 'remove')
      .map(change => change.id);
    
    if (removedIds.length > 0 && this.selectedNode && removedIds.includes(this.selectedNode.id)) {
      this.selectedNode = null;
    }
    
    // 更新selectedNodes
    this.selectedNodes = this.selectedNodes.filter(node => !removedIds.includes(node.id));
  };
  
  onEdgesChange = (changes: EdgeChange[]) => {
    // 确保changes和this.edges都是数组
    if (!Array.isArray(changes) || !Array.isArray(this.edges)) {
      console.warn('onEdgesChange: Invalid input or state', { 
        changes: Array.isArray(changes), 
        edges: Array.isArray(this.edges) 
      });
      return;
    }
    
    this.edges = applyEdgeChanges(changes, this.edges);
  };
  
  addNode = (type: 'agent' | 'team', position = { x: 100, y: 100 }) => {
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position,
      data: {
        name: type === 'agent' ? 'New Agent' : 'New Team',
        ...(type === 'agent' && { 
          model: 'openai/gpt-4o-mini',
          tools: [],
          prompt: '',
          transition_prompt: ''
        })
      }
    };
    
    this.nodes = [...this.nodes, newNode];
    this.selectedNode = newNode;
    return newNode;
  };
  
  deleteNode = (nodeId: string) => {
    // 删除相关的边
    this.edges = this.edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );
    
    // 删除节点
    this.nodes = this.nodes.filter(node => node.id !== nodeId);
    
    // 如果删除的是当前选中的节点，清除选择
    if (this.selectedNode?.id === nodeId) {
      this.selectedNode = null;
    }
    
    // 从selectedNodes中移除
    this.selectedNodes = this.selectedNodes.filter(node => node.id !== nodeId);
  };
  
  deleteSelectedNodes = () => {
    const nodesToDelete = this.selectedNodes.length > 0 
      ? this.selectedNodes 
      : (this.selectedNode ? [this.selectedNode] : []);
    
    for (const node of nodesToDelete) {
      this.deleteNode(node.id);
    }
  };
  
  updateNodeData = (nodeId: string, newData: any) => {
    this.nodes = this.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...newData
          }
        };
      }
      return node;
    });
    
    // 如果更新的是当前选中的节点，同步更新selectedNode
    if (this.selectedNode?.id === nodeId) {
      this.selectedNode = {
        ...this.selectedNode,
        data: {
          ...this.selectedNode.data,
          ...newData
        }
      };
    }

    if (newData.team_call) {
      const teamNode = this.nodes.find(node => node.data.name === newData.team_call);
      const callNode = this.nodes.find(node => node.id === nodeId);
      if (!teamNode) {
        console.log("should load team config:", newData.team_call);
        loadConfigRecursively('configs/' + newData.team_call + ".json").then(config => {
          console.log("team config loaded:", config);
          this.createNodesAndEdgesFromConfig(config, 'configs/' + newData.team_call + ".json", true, callNode?.id);
        });
      }
    }
  };
  
  setSelectedNode = (node: Node | null) => {
    this.selectedNode = node;
  };
  
  setSelectedNodes = (nodes: Node[]) => {
    this.selectedNodes = nodes;
  };
  
  setReactFlowInstance = (instance: ReactFlowInstance | null) => {
    this.reactFlowInstance = instance;
  };
  
  get hasSelectedNodes() {
    return this.selectedNodes.length > 0 || this.selectedNode !== null;
  }
  
  // 从配置创建节点和边
  createNodesAndEdgesFromConfig = (config: any, filePath: string, shouldAppend = true, parentId: string = '') => {
    // 如果不是追加模式，则重置节点和边
    if (!shouldAppend) {
      this.nodes = [];
      this.edges = [];
    }

    const startY = 50;
    
    // 计算起始X位置
    const currentStartX = (() => {
      const maxX = this.nodes.length > 0 
        ? Math.max(...this.nodes.map(node => node.position.x)) 
        : 0;
      return maxX + 300; // 在当前节点之后300px放置新节点
    })();
    
    // 递归创建节点的函数
    const createNodesRecursively = (
      config: any, 
      startX: number, 
      startY: number, 
      parentId?: string
    ): { nodes: Node[], edges: Edge[], mainTeamId: string } => {
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const localTimestamp = Date.now() + Math.floor(Math.random() * 1000);
      
      // 为每个 agent 创建节点
      const agentNodes = (config.agents || []).map((agent: any, index: number) => {
        const nodeId = `node_${localTimestamp}_${index}`;
        const node: Node = {
          id: nodeId,
          type: 'agent',
          position: {
            x: startX,
            y: startY + (index + 1)* 150
          },
          data: { 
            ...agent,
            // 添加配置来源标记
            _sourceConfig: config.name || filePath.split('/').pop()
          }
        };
        
        return node;
      });
      
      // 添加团队节点
      const teamNodeId = `team_${localTimestamp}`;
      const teamNode: Node = {
        id: teamNodeId,
        type: 'team',
        position: {
          x: startX,
          y: startY
        },
        data: {
          name: config.name || "new_team",
          team_type: config.team_type as "round_robin" | "tree" | "parallel",
          team_prompt: config.team_prompt || "",
          agentCount: agentNodes.length,
          duration: config.duration || 0,
          twitter: config.twitter || {},
          telegram: config.telegram || {}
        }
      };
      
      newNodes.push(teamNode);
      newNodes.push(...agentNodes);
      
      // 创建团队到agent的边，以及agent之间的顺序连接
      agentNodes.forEach((agentNode, index) => {
        // 创建团队到第一个agent的边
        if (index === 0) {
          const edgeId = `edge_${teamNodeId}_to_${agentNode.id}`;
          const edge: Edge = {
            id: edgeId,
            source: teamNodeId,
            target: agentNode.id,
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 10,
              height: 10,
              color: '#888'
            }
          };
          newEdges.push(edge);
        }
        
        // 创建agent之间的顺序连接（agent1 -> agent2 -> agent3...）
        if (index < agentNodes.length - 1) {
          const nextAgentNode = agentNodes[index + 1];
          const edgeId = `edge_${agentNode.id}_to_${nextAgentNode.id}`;
          const edge: Edge = {
            id: edgeId,
            source: agentNode.id,
            target: nextAgentNode.id,
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 10,
              height: 10,
              color: '#888'
            }
          };
          newEdges.push(edge);
        }
      });
      
      // 如果有父节点，创建父节点到团队节点的连接
      if (parentId) {
        const parentEdgeId = `edge_${parentId}_to_${teamNodeId}`;
        const parentEdge: Edge = {
          id: parentEdgeId,
          source: parentId,
          target: teamNodeId,
          type: 'default',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 10,
            height: 10,
            color: '#888'
          }
        };
        
        newEdges.push(parentEdge);
      }
      
      // 递归处理每个agent的team_cfg
      let offsetY = 0;
      for (let i = 0; i < agentNodes.length; i++) {
        const agent = config.agents[i];
        if (agent.team_cfg) {
          const subTeam = createNodesRecursively(
            agent.team_cfg,
            startX + 230,
            startY + 150 + offsetY,
            agentNodes[i].id
          );
          
          newNodes.push(...subTeam.nodes);
          newEdges.push(...subTeam.edges);
          
          // 调整下一个子团队的垂直位置
          offsetY += 300;
        }
      }
      
      return { nodes: newNodes, edges: newEdges, mainTeamId: teamNodeId };
    };
    
    // 创建所有节点和边
    const { nodes: newNodes, edges: newEdges } = createNodesRecursively(config, currentStartX, startY, parentId);
    
    console.log('Created nodes and edges to add:', {
      nodesCount: newNodes.length,
      edgesCount: newEdges.length
    });

    // 检查边结构的有效性
    const validEdges = newEdges.filter(edge => {
      const isValid = edge && typeof edge === 'object' && 
        typeof edge.id === 'string' && 
        typeof edge.source === 'string' && 
        typeof edge.target === 'string';
      
      if (!isValid) {
        console.assert(false, 'Invalid edge format:', edge);
      }
      
      return isValid;
    });

    if (validEdges.length !== newEdges.length) {
      console.assert(false, `Some edges (${newEdges.length - validEdges.length}) were filtered due to invalid format`);
    }

    try {
      // 更新节点和边
      if (shouldAppend) {
        // 在追加模式下，将新节点和边添加到现有的集合中
        this.nodes = [...this.nodes, ...newNodes];
        this.edges = [...this.edges, ...validEdges];
        console.log('Appended new nodes and edges to existing ones');
      } else {
        // 在替换模式下，用新节点和边替换现有的
        this.nodes = newNodes;
        this.edges = validEdges;
        console.log('Replaced nodes and edges with new ones');
      }
    } catch (error) {
      console.error('Error updating nodes or edges:', error);
    }

    return { nodes: newNodes, edges: validEdges };
  };
  
  // Save workspace to localStorage with versioning
  saveWorkspace = () => {
    try {
      const workspace = {
        nodes: this.nodes,
        edges: this.edges,
        timestamp: Date.now(),
        name: `Workspace ${new Date().toLocaleString()}`
      };

      // Get existing workspaces
      const existingWorkspaces = this.getSavedWorkspaces();
      
      // Add new workspace to the beginning of the array
      existingWorkspaces.unshift(workspace);
      
      // Keep only the 10 most recent workspaces
      const workspacesToSave = existingWorkspaces.slice(0, 10);
      
      // Save to localStorage
      localStorage.setItem('agentFlow_workspaces', JSON.stringify(workspacesToSave));
      
      this.rootStore.uiStore.showNotification('success', '工作区已保存', 3000);
    } catch (error) {
      console.error('Error saving workspace:', error);
      this.rootStore.uiStore.showNotification('error', '保存工作区失败', 3000);
    }
  };

  // Get all saved workspaces
  getSavedWorkspaces = () => {
    try {
      const savedWorkspaces = localStorage.getItem('agentFlow_workspaces');
      return savedWorkspaces ? JSON.parse(savedWorkspaces) : [];
    } catch (error) {
      console.error('Error getting saved workspaces:', error);
      return [];
    }
  };

  // Load specific workspace by index
  loadWorkspaceByIndex = (index: number) => {
    try {
      const workspaces = this.getSavedWorkspaces();
      if (workspaces && workspaces[index]) {
        const workspace = workspaces[index];
        this.nodes = workspace.nodes;
        this.edges = workspace.edges;
        this.rootStore.uiStore.showNotification('success', `已加载工作区: ${workspace.name}`, 3000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading workspace:', error);
      this.rootStore.uiStore.showNotification('error', '加载工作区失败', 3000);
      return false;
    }
  };

  // Load the most recent workspace
  loadWorkspace = () => {
    // Try to load from localStorage first
    const savedWorkspace = localStorage.getItem('lastWorkspace');
    if (savedWorkspace) {
      try {
        const workspace = JSON.parse(savedWorkspace);
        this.nodes = workspace.nodes;
        this.edges = workspace.edges;
        console.log('Loaded workspace from localStorage');
        return;
      } catch (error) {
        console.error('Error loading workspace from localStorage:', error);
      }
    }
    
    // If no localStorage data or error occurred, load from server
    this.loadWorkspaceByIndex(0);
  };

  // Delete a specific workspace
  deleteWorkspace = (index: number) => {
    try {
      const workspaces = this.getSavedWorkspaces();
      if (workspaces && workspaces[index]) {
        workspaces.splice(index, 1);
        localStorage.setItem('agentFlow_workspaces', JSON.stringify(workspaces));
        this.rootStore.uiStore.showNotification('success', '工作区已删除', 3000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting workspace:', error);
      this.rootStore.uiStore.showNotification('error', '删除工作区失败', 3000);
      return false;
    }
  };
  
  // 序列化节点数据，用于与ConfigStore同步
  serializeNodes = () => {
    // 确保nodes是数组再调用filter
    if (!Array.isArray(this.nodes)) {
      return [];
    }
    
    return this.nodes
      .filter(node => node.type === 'agent')
      .map(node => ({
        ...node.data,
        id: node.id
      }));
  };
  
  // 从配置的agents更新节点
  updateNodesFromAgents = (agents: any[]) => {
    // 这个方法在后续集成ConfigStore时实现
    // 此处仅为占位
  };
} 