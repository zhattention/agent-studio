import { useCallback } from 'react';
import { Connection, addEdge } from 'reactflow';

export const useEdgeOperations = (
  nodes: any[],
  edges: any[],
  setEdges: any,
  showNotification: (type: 'success' | 'error' | 'info', message: string, duration?: number) => void,
  updateAgentsOrder: () => void
) => {
  // Handle node connections
  const onConnect = useCallback((params: Connection) => {
    console.log('onConnect', params);

    // 创建新连接
    const newEdge: any = {
      ...params,
      id: `edge_${params.source}_to_${params.target}`,
      type: 'default'
    };
    
    // 检查是否是从team节点到agent节点的连接
    const sourceNode = nodes.find(node => node.id === params.source)

    delete newEdge.style;
    
    setEdges((eds: any) => addEdge(newEdge, eds));
    updateAgentsOrder();
    
    // 连接成功通知
    showNotification('success', '节点连接成功', 2000);
  }, [nodes, setEdges, updateAgentsOrder, showNotification]);

  // 删除连接
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    // 显示确认对话框以删除连接
    if (window.confirm(`是否删除从 ${edge.source} 到 ${edge.target} 的连接？`)) {
      setEdges((eds: any) => eds.filter((e: any) => e.id !== edge.id));
      
      showNotification('info', '连接已删除', 2000);
      
      // 更新节点连接状态
      updateAgentsOrder();
    }
  }, [setEdges, updateAgentsOrder, showNotification]);
  
  // 自定义边标签
  const getEdgeLabel = useCallback((edge: any) => {
    const sourceNode = nodes.find(node => node.id === edge.source);
    const targetNode = nodes.find(node => node.id === edge.target);
    
    if (!sourceNode || !targetNode) return '';
    
    const sourceType = sourceNode.type === 'team' ? '团队' : 'Agent';
    const targetType = targetNode.type === 'team' ? '团队' : 'Agent';
    
    return `${sourceType} → ${targetType}`;
  }, [nodes]);

  return {
    onConnect,
    onEdgeClick,
    getEdgeLabel
  };
}; 