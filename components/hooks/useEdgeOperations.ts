import { useCallback } from 'react';
import { Connection, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import { useStore } from '../../stores/StoreContext';

export const useEdgeOperations = (
  nodes: any[],
  edges: Edge[],
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  updateAgentsOrder: () => void
) => {
  const { uiStore } = useStore();
  
  // Add a new edge when nodes are connected
  const onConnect = useCallback((connection: Connection) => {
    // Create a unique ID for the new edge
    const id = `edge-${connection.source}-${connection.target}`;
    
    // Check if edge already exists
    const alreadyExists = edges.some(
      (edge) => edge.source === connection.source && edge.target === connection.target
    );
    
    if (alreadyExists) {
      return;
    }
    
    // Add the new edge
    setEdges((prevEdges) => [
      ...prevEdges,
      {
        id,
        source: connection.source || '',
        target: connection.target || '',
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 10,
          height: 10,
          color: '#888'
        }
      },
    ]);
    
    // Update agents order to reflect the new connection
    updateAgentsOrder();
    
    uiStore.showNotification('success', '节点连接成功', 2000);
  }, [nodes, setEdges, updateAgentsOrder, uiStore]);
  
  // Handle edge click (e.g., for deletion)
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    // Delete the edge
    setEdges((prevEdges) => prevEdges.filter((e) => e.id !== edge.id));
    
    // Update agents order to reflect the removed connection
    updateAgentsOrder();
    
    uiStore.showNotification('info', '连接已删除', 2000);
  }, [setEdges, updateAgentsOrder, uiStore]);
  
  // Function to generate edge labels if needed
  const getEdgeLabel = useCallback((edge: Edge) => {
    return '';
  }, []);
  
  return { onConnect, onEdgeClick, getEdgeLabel };
}; 