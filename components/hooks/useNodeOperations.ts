import { useCallback } from 'react';
import { addEdge } from 'reactflow';
import { useStore } from '../../stores/StoreContext';
import { AVAILABLE_MODELS } from '../constants';

// Available tools and models list
export const availableTools = [
  "twitter_limit_search", 
  "twitter_post_tweet", 
  "start_team",
  "twitter_like_tweet",
  "twitter_retweet"
];

// Export AVAILABLE_MODELS from constants instead of defining it here
export const availableModels = AVAILABLE_MODELS;

export const useNodeOperations = (
  nodes: any[],
  edges: any[],
  setNodes: any,
  setEdges: any,
  selectedNode: any,
  setSelectedNode: any,
  selectedNodes: any[],
  setSelectedNodes: any,
  updateAgentsOrder: () => void
) => {
  const { uiStore } = useStore();
  
  // Add a new node to the canvas
  const onAddNode = useCallback((type: 'agent' | 'team') => {
    // 生成节点ID
    const nodeId = `node_${Date.now()}`;
    
    // 确定新节点的位置
    let position: { x: number, y: number };
    let connectSource: string | null = null;
    let hasOutgoingConnection = false;
    let outgoingTarget: string | null = null;
    
    if (type === 'agent' && selectedNode) {
      // 如果添加的是agent，且有选中的节点，则放在选中节点右侧
      position = {
        x: selectedNode.position.x + 250, // 右侧偏移
        y: selectedNode.position.y // 保持同一水平线
      };
      
      // 如果选中的是agent或team，则新节点与选中节点建立连接
      if (selectedNode.type === 'agent' || selectedNode.type === 'team') {
        connectSource = selectedNode.id;
        
        // 检查选中节点是否已有连出的边
        edges.forEach(edge => {
          if (edge.source === selectedNode.id) {
            hasOutgoingConnection = true;
            outgoingTarget = edge.target;
          }
        });
      }
    } else {
      // 默认位置
      position = {
        x: 100 + Math.random() * 100,
        y: type === 'team' ? 50 : 200, // team节点在上方，agent节点在下方
      };
    }
    
    // 创建节点数据
    const nodeData = type === 'agent' 
      ? {
          name: `agent_${nodes.filter(n => n.type === 'agent').length + 1}`,
          tools: [],
          model: availableModels[0]?.id || "",
          prompt: "",
          transition_prompt: ""
        }
      : {
          name: `team_${nodes.filter(n => n.type === 'team').length + 1}`,
          team_type: "round_robin" as const,
          agentCount: 0 // 新团队初始没有agent
        };
    
    // 创建新节点
    const newNode: any = {
      id: nodeId,
      type,
      position,
      data: nodeData
    };
    
    // 添加节点到画布
    setNodes((nds: any) => [...nds, newNode]);
    
    // 处理边的连接
    if (type === 'team') {
      // 如果添加的是team节点，尝试连接到第一个agent节点
      const firstAgent = nodes.find(node => node.type === 'agent');
      if (firstAgent) {
        setEdges((eds: any) => [
          ...eds, 
          {
            id: `edge_${nodeId}_to_${firstAgent.id}`,
            source: nodeId,
            target: firstAgent.id,
            type: 'default',
            style: { stroke: '#2e7d32', strokeWidth: 2 }
          }
        ]);
      }
    } else if (type === 'agent') {
      // 如果是添加agent节点
      
      // 处理选中节点的情况
      if (connectSource) {
        const newEdges: any[] = [];
        
        // 连接选中节点到新节点
        newEdges.push({
          id: `edge_${connectSource}_to_${nodeId}`,
          source: connectSource,
          target: nodeId,
          type: 'default',
        });
        
        // 如果选中节点有连出的边，将目标节点连接到新节点
        if (hasOutgoingConnection && outgoingTarget) {
          newEdges.push({
            id: `edge_${nodeId}_to_${outgoingTarget}`,
            source: nodeId,
            target: outgoingTarget,
            type: 'default'
          });
          
          // 删除原来的边（从选中节点到其下游节点的边）
          setEdges((eds: any) => [...eds.filter((edge: any) => 
            !(edge.source === connectSource && edge.target === outgoingTarget)
          ), ...newEdges]);
        } else {
          // 没有下游连接，只添加新边
          setEdges((eds: any) => [...eds, ...newEdges]);
        }
        
        // 更新所选节点为新添加的节点
        setSelectedNode(newNode);
        return;
      }
      
      // 1. 查找是否有team节点但没有连接到任何agent
      const teamNodes = nodes.filter(node => node.type === 'team');
      if (teamNodes.length > 0) {
        // 检查每个team节点是否已经有连出的边
        const teamsWithConnections = new Set<string>();
        edges.forEach(edge => {
          if (teamNodes.some(team => team.id === edge.source)) {
            teamsWithConnections.add(edge.source);
          }
        });
        
        // 找到第一个没有连接的team节点
        const unconnectedTeam = teamNodes.find(team => !teamsWithConnections.has(team.id));
        if (unconnectedTeam) {
          setEdges((eds: any) => [
            ...eds, 
            {
              id: `edge_${unconnectedTeam.id}_to_${nodeId}`,
              source: unconnectedTeam.id,
              target: nodeId,
              type: 'default',
            }
          ]);
        }
      }
      
      // 2. 如果没有选中节点，则连接到最后一个agent节点（如果有的话）
      if (!selectedNode) {
        const agentNodes = nodes.filter(node => node.type === 'agent');
        if (agentNodes.length > 0) {
          const lastAgent = agentNodes[agentNodes.length - 1];
          setEdges((eds: any) => [
            ...eds, 
            {
              id: `edge_${lastAgent.id}_${nodeId}`,
              source: lastAgent.id,
              target: nodeId,
              type: 'default'
            }
          ]);
        }
      }
      
      // 将新添加的节点设置为当前选中节点
      setSelectedNode(newNode);
    }
    
  }, [nodes, edges, selectedNode, setNodes, setEdges, setSelectedNode]);

  // Delete selected node(s)
  const onDeleteNode = useCallback(() => {
    if (selectedNodes.length > 0) {
      // 批量删除多个选中的节点
      const selectedIds = new Set(selectedNodes.map(node => node.id));
      
      // 为每个被删除的节点创建重连信息
      const reconnections: {
        source: string;
        target: string;
        style?: React.CSSProperties;
      }[] = [];
      
      // 收集所有需要重连的节点对
      selectedNodes.forEach(nodeToDelete => {
        // 查找这个节点的入边（指向这个节点的边）
        const incomingEdges = edges.filter(edge => edge.target === nodeToDelete.id);
        
        // 查找这个节点的出边（从这个节点出发的边）
        const outgoingEdges = edges.filter(edge => edge.source === nodeToDelete.id);
        
        // 如果节点同时有入边和出边，则考虑重新连接
        if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
          // 对于每个入边源节点和出边目标节点的组合，创建重连
          incomingEdges.forEach(inEdge => {
            // 如果入边的源节点不在被删除的节点列表中
            if (!selectedIds.has(inEdge.source)) {
              outgoingEdges.forEach(outEdge => {
                // 如果出边的目标节点不在被删除的节点列表中
                if (!selectedIds.has(outEdge.target)) {
                  reconnections.push({
                    source: inEdge.source,
                    target: outEdge.target,
                    // 如果入边是从team来的，保留特殊样式
                    style: inEdge.style
                  });
                }
              });
            }
          });
        }
      });
      
      // 删除选中的节点
      setNodes((nds: any) => nds.filter((node: any) => !selectedIds.has(node.id)));
      
      // 删除与这些节点相关的边
      setEdges((eds: any) => {
        // 过滤掉涉及被删除节点的所有边
        const remainingEdges = eds.filter(
          (edge: any) => !selectedIds.has(edge.source) && !selectedIds.has(edge.target)
        );
        
        // 添加重新连接的边
        const newEdges = reconnections.map(reconnect => ({
          id: `edge_${reconnect.source}_to_${reconnect.target}_relink`,
          source: reconnect.source,
          target: reconnect.target,
          type: 'default',
        }));
        
        return [...remainingEdges, ...newEdges];
      });
      
      // 清空选择
      setSelectedNodes([]);
      setSelectedNode(null);
      
      uiStore.showNotification('success', 
        `已删除${selectedNodes.length}个节点，重连了${reconnections.length}个连接`
      );
    } else if (selectedNode) {
      // 单节点删除
      
      // 查找这个节点的入边（指向这个节点的边）
      const incomingEdges = edges.filter(edge => edge.target === selectedNode.id);
      
      // 查找这个节点的出边（从这个节点出发的边）
      const outgoingEdges = edges.filter(edge => edge.source === selectedNode.id);
      
      // 收集需要重建的连接
      const reconnections: {
        source: string;
        target: string;
        style?: React.CSSProperties;
      }[] = [];
      
      // 如果节点同时有入边和出边，则自动重新连接
      if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
        incomingEdges.forEach(inEdge => {
          outgoingEdges.forEach(outEdge => {
            reconnections.push({
              source: inEdge.source,
              target: outEdge.target,
            });
          });
        });
      }
      
      // 删除节点
      setNodes((nds: any) => nds.filter((node: any) => node.id !== selectedNode.id));
      
      // 删除旧边并添加新连接
      setEdges((eds: any) => {
        // 过滤掉与被删除节点相关的边
        const remainingEdges = eds.filter(
          (edge: any) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
        );
        
        // 创建新的重连边
        const newEdges = reconnections.map(reconnect => ({
          id: `edge_${reconnect.source}_to_${reconnect.target}_relink`,
          source: reconnect.source,
          target: reconnect.target,
          type: 'default',
        }));
        
        return [...remainingEdges, ...newEdges];
      });
      
      setSelectedNode(null);
      
      if (reconnections.length > 0) {
        uiStore.showNotification('success', 
          `已删除节点并重新连接${reconnections.length}个连接`
        );
      }
    }
    
    // 更新节点连接状态
    updateAgentsOrder();
  }, [selectedNode, selectedNodes, edges, setNodes, setEdges, setSelectedNode, setSelectedNodes, updateAgentsOrder]);

  // Update node data when edited
  const onNodeDataUpdate = useCallback((data: any) => {
    setNodes((nds: any) => 
      nds.map((node: any) => {
        if (node.id === selectedNode?.id) {
          return {
            ...node,
            data: { ...data },
          };
        }
        return node;
      })
    );
    updateAgentsOrder();
  }, [selectedNode, setNodes, updateAgentsOrder]);

  // 批量对齐节点
  const alignNodes = useCallback((direction: 'horizontal' | 'vertical' | 'grid') => {
    if (selectedNodes.length < 2) return;
    
    // 复制当前所有节点
    const updatedNodes = [...nodes];
    const selectedIds = new Set(selectedNodes.map(node => node.id));
    
    // 计算选中节点的坐标范围
    let values;
    if (direction === 'horizontal') {
      // 水平对齐（垂直居中）- 使用y坐标的平均值
      const avgY = selectedNodes.reduce((sum, node) => sum + node.position.y, 0) / selectedNodes.length;
      values = { y: avgY };
    } else if (direction === 'vertical') {
      // 垂直对齐（水平居中）- 使用x坐标的平均值
      const avgX = selectedNodes.reduce((sum, node) => sum + node.position.x, 0) / selectedNodes.length;
      values = { x: avgX };
    } else if (direction === 'grid') {
      // 网格排列 - 根据节点数量计算合适的网格
      const count = selectedNodes.length;
      const cols = Math.ceil(Math.sqrt(count));
      const startX = Math.min(...selectedNodes.map(node => node.position.x));
      const startY = Math.min(...selectedNodes.map(node => node.position.y));
      const spacing = 250; // 节点间距
      
      selectedNodes.forEach((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const nodeIndex = updatedNodes.findIndex(n => n.id === node.id);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            position: {
              x: startX + col * spacing,
              y: startY + row * spacing
            }
          };
        }
      });
      
      setNodes(updatedNodes);
      return;
    }
    
    // 更新所有选中节点的位置
    for (let i = 0; i < updatedNodes.length; i++) {
      if (selectedIds.has(updatedNodes[i].id)) {
        updatedNodes[i] = {
          ...updatedNodes[i],
          position: {
            ...updatedNodes[i].position,
            ...values
          }
        };
      }
    }
    
    setNodes(updatedNodes);
  }, [selectedNodes, nodes, setNodes]);

  return {
    onAddNode,
    onDeleteNode,
    onNodeDataUpdate,
    alignNodes
  };
}; 