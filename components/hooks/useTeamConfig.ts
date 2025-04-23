import { useCallback } from 'react';
import { saveConfig } from '../../services/api';
import { TeamConfig } from '../../types';

export const useTeamConfig = (
  teamConfig: TeamConfig,
  setTeamConfig: React.Dispatch<React.SetStateAction<TeamConfig>>,
  nodes: any[],
  setNodes: any,
  showNotification: (type: 'success' | 'error' | 'info', message: string, duration?: number) => void
) => {
  // Update team configuration
  const updateTeamConfig = useCallback((updatedConfig: TeamConfig) => {
    setTeamConfig(updatedConfig);
    
    // Update related team nodes display name
    setNodes((nds: any) => 
      nds.map((node: any) => {
        if (node.type === 'team') {
          return {
            ...node,
            data: {
              ...node.data,
              name: updatedConfig.name,
              team_type: updatedConfig.team_type
            }
          };
        }
        return node;
      })
    );
    
    showNotification('success', '团队配置已更新', 2000);
  }, [setTeamConfig, setNodes, showNotification]);

  // Update agents order based on connections
  const updateAgentsOrder = useCallback(() => {
    // Create a copy of the current team config
    const updatedConfig = { ...teamConfig };
    
    // Clear the current agents array
    updatedConfig.agents = [];
    
    // Create a map from node ID to node
    const nodeMap: Record<string, any> = {};
    nodes.forEach(node => {
      if (node.type === 'agent') {
        nodeMap[node.id] = node;
      }
    });
    
    // Create an adjacency list from the edges
    const adjacencyList: Record<string, string[]> = {};
    const edges = nodes.flatMap(node => 
      node.type === 'agent' && node.__rf?.edges ? node.__rf.edges : []
    );
    
    edges.forEach(edge => {
      if (!adjacencyList[edge.source]) {
        adjacencyList[edge.source] = [];
      }
      adjacencyList[edge.source].push(edge.target);
    });
    
    // Find nodes with no incoming edges (start nodes)
    const incomingEdges: Record<string, number> = {};
    edges.forEach(edge => {
      if (!incomingEdges[edge.target]) {
        incomingEdges[edge.target] = 0;
      }
      incomingEdges[edge.target]++;
    });
    
    const startNodes = nodes
      .filter(node => node.type === 'agent' && !incomingEdges[node.id])
      .map(node => node.id);
    
    // Perform a topological sort
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];
    
    function visit(nodeId: string) {
      if (temp.has(nodeId)) return; // Not a DAG, has a cycle
      if (visited.has(nodeId)) return;
      
      temp.add(nodeId);
      
      const neighbors = adjacencyList[nodeId] || [];
      for (const neighbor of neighbors) {
        visit(neighbor);
      }
      
      temp.delete(nodeId);
      visited.add(nodeId);
      order.unshift(nodeId);
    }
    
    for (const nodeId of startNodes) {
      visit(nodeId);
    }
    
    // Add any remaining agent nodes (disconnected)
    nodes.forEach(node => {
      if (node.type === 'agent' && !visited.has(node.id)) {
        order.unshift(node.id);
      }
    });
    
    // Populate the agents array using the order
    order.forEach(nodeId => {
      if (nodeMap[nodeId]) {
        updatedConfig.agents.push(nodeMap[nodeId].data);
      }
    });
    
    // Set the updated team config
    setTeamConfig(updatedConfig);
    
    // Update team nodes with agent counts
    const teamToAgentsMap: Record<string, number> = {};
    nodes.forEach(node => {
      if (node.type === 'team') {
        // Count directly connected agents
        const connectedAgents = nodes.filter(n => {
          if (n.type !== 'agent') return false;
          const edges = n.__rf?.edges || [];
          return edges.some(e => 
            (e.source === node.id && e.target === n.id) || 
            (e.target === node.id && e.source === n.id)
          );
        }).length;
        
        teamToAgentsMap[node.id] = connectedAgents;
      }
    });
    
    // Update each team node's agentCount
    setNodes((nds: any) => 
      nds.map((node: any) => {
        if (node.type === 'team' && teamToAgentsMap[node.id] !== undefined) {
          return {
            ...node,
            data: {
              ...node.data,
              agentCount: teamToAgentsMap[node.id]
            }
          };
        }
        return node;
      })
    );
  }, [nodes, teamConfig, setNodes, setTeamConfig]);

  // Save configuration to server
  const handleSaveConfig = useCallback(async () => {
    try {
      // Update agents array to ensure it uses the latest content from nodes
      const updatedAgents = nodes
        .filter(node => node.type === 'agent')
        .map(node => {
          return {
            ...node.data,
            // If there's an original prompt path, save both path and content
            ...(node.data.prompt_path ? { prompt_path: node.data.prompt_path } : {})
          };
        });
      
      // Create a complete team configuration using the latest agents data
      const config = {
        ...teamConfig,
        agents: updatedAgents
      };
      
      const response = await saveConfig(teamConfig.name, config);
      
      if (response.success) {
        // Update frontend state to sync with saved configuration
        setTeamConfig(prevConfig => ({
          ...prevConfig,
          agents: updatedAgents,
          _lastSaved: new Date().toISOString() // Add last saved time marker
        }));
        
        // Sync update all related nodes
        setNodes((nds: any) => 
          nds.map((node: any) => {
            if (node.type === 'team') {
              return {
                ...node,
                data: {
                  ...node.data,
                  _lastSaved: new Date().toISOString()
                }
              };
            } else if (node.type === 'agent') {
              // Make sure agent nodes also update config source marker
              return {
                ...node,
                data: {
                  ...node.data,
                  _sourceConfig: teamConfig.name,
                  _lastSaved: new Date().toISOString()
                }
              };
            }
            return node;
          })
        );
        
        showNotification('success', `配置已保存: ${response.path || teamConfig.name}`);
      } else {
        showNotification('error', response.message || '保存失败');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showNotification('error', 
        `保存失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [teamConfig, nodes, setNodes, setTeamConfig, showNotification]);

  return {
    updateTeamConfig,
    updateAgentsOrder,
    handleSaveConfig
  };
}; 