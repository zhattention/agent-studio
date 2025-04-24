import { makeObservable, observable, action, computed } from 'mobx';
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

// 使用interface代替直接引用，避免循环依赖
export interface IRootStore {
  nodeStore: NodeStore;
  configStore: {
    updateAgentsFromNodes: (agents: any[]) => void;
  };
  manualSync: () => void; // 添加手动同步方法
}

export class NodeStore {
  nodes: Node[] = [];
  edges: Edge[] = [];
  selectedNode: Node | null = null;
  selectedNodes: Node[] = [];
  reactFlowInstance: ReactFlowInstance | null = null;
  
  rootStore: IRootStore;

  constructor(rootStore: IRootStore) {
    this.rootStore = rootStore;
    
    makeObservable(this, {
      nodes: observable,
      edges: observable,
      selectedNode: observable,
      selectedNodes: observable,
      reactFlowInstance: observable,
      
      setNodes: action,
      setEdges: action,
      onNodesChange: action,
      onEdgesChange: action,
      addNode: action,
      deleteNode: action,
      updateNodeData: action,
      setSelectedNode: action,
      setSelectedNodes: action,
      setReactFlowInstance: action,
      
      hasSelectedNodes: computed
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