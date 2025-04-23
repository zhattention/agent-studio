import { useCallback, useEffect } from 'react';
import { getConfigFiles, getPromptFiles, loadFile, loadConfigRecursively } from '../../services/api';
import { FileSelectorType } from '../../types/agentFlow';
import { FileInfo } from '../../types';

export const useFileOperations = (
  fileSelectorType: FileSelectorType,
  nodes: any[],
  setNodes: any,
  edges: any[],
  setEdges: any,
  selectedNode: any,
  setTeamConfig: any,
  teamConfig: any,
  setConfigFiles: React.Dispatch<React.SetStateAction<FileInfo[]>>,
  setPromptFiles: React.Dispatch<React.SetStateAction<FileInfo[]>>,
  closeFileSelector: () => void,
  onNodeDataUpdate: (data: any) => void,
  showNotification: (type: 'success' | 'error' | 'info', message: string, duration?: number) => void
) => {
  // Fetch file lists when component mounts
  useEffect(() => {
    const fetchConfigFiles = async () => {
      try {
        const data = await getConfigFiles();
        setConfigFiles(data);
      } catch (error) {
        console.error('Error fetching config files:', error);
      }
    };
    
    const fetchPromptFiles = async () => {
      try {
        const data = await getPromptFiles();
        setPromptFiles(data);
      } catch (error) {
        console.error('Error fetching prompt files:', error);
      }
    };
    
    fetchConfigFiles();
    fetchPromptFiles();
  }, [setConfigFiles, setPromptFiles]);

  // Load file from server
  const loadFileFromServer = useCallback(async (filePath: string, shouldAppend = true) => {
    try {
      if (fileSelectorType === 'config') {
        // 处理配置文件 - 使用递归加载
        const config = await loadConfigRecursively(filePath);
        
        // 如果不是追加模式，则重置画布
        if (!shouldAppend) {
          setNodes([]);
          setTeamConfig({
            name: config.name || "new_team",
            team_type: config.team_type || "round_robin",
            team_prompt: config.team_prompt || "",
            agents: [],
            duration: config.duration || 0
          });
        }
        
        // 生成独特的时间戳确保ID不重复
        const timestamp = Date.now();
        
        // 获取当前节点的位置，以便计算新节点的布局
        const currentNodes = [...nodes];
        const maxX = currentNodes.length > 0 
          ? Math.max(...currentNodes.map(node => node.position.x)) 
          : 0;
        const startX = maxX + 300; // 在当前节点之后300px放置新节点
        
        // 递归创建节点的函数
        const createNodesRecursively = (
          config: any, 
          startX: number, 
          startY: number, 
          parentId?: string
        ): { nodes: any[], edges: any[], mainTeamId: string } => {
          const newNodes: any[] = [];
          const newEdges: any[] = [];
          const localTimestamp = Date.now() + Math.floor(Math.random() * 1000);
          
          // 为每个 agent 创建节点
          const agentNodes = (config.agents || []).map((agent: any, index: number) => {
            const nodeId = `node_${localTimestamp}_${index}`;
            const node = {
              id: nodeId,
              type: 'agent' as const,
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
          const teamNode: any = {
            id: teamNodeId,
            type: 'team' as const,
            position: {
              x: startX,
              y: startY
            },
            data: {
              name: config.name || "new_team",
              team_type: config.team_type as "round_robin" | "tree" | "parallel",
              agentCount: agentNodes.length // 添加agent数量
            }
          };
          
          newNodes.push(teamNode);
          newNodes.push(...agentNodes);
          
          // 创建团队到agent的边，以及agent之间的顺序连接（agent1 -> agent2 -> agent3）
          agentNodes.forEach((agentNode, index) => {
            // 创建团队到第一个agent的边
            if (index === 0) {
              const edgeId = `edge_${teamNodeId}_to_${agentNode.id}`;
              const edge = {
                id: edgeId,
                source: teamNodeId,
                target: agentNode.id,
                type: 'default',
              };
              newEdges.push(edge);
            }
            
            // 创建agent之间的顺序连接（agent1 -> agent2 -> agent3...）
            if (index < agentNodes.length - 1) {
              const nextAgentNode = agentNodes[index + 1];
              const edgeId = `edge_${agentNode.id}_to_${nextAgentNode.id}`;
              const edge = {
                id: edgeId,
                source: agentNode.id,
                target: nextAgentNode.id,
                type: 'default',
              };
              newEdges.push(edge);
            }
          });
          
          // 如果有父节点，创建父节点到团队节点的连接
          if (parentId) {
            const parentEdgeId = `edge_${parentId}_to_${teamNodeId}`;
            const parentEdge = {
              id: parentEdgeId,
              source: parentId,
              target: teamNodeId,
              type: 'default'
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
        const { nodes: newNodes, edges: newEdges } = createNodesRecursively(config, startX, 50);
        
        console.log('Created nodes and edges to add:', {
          nodesCount: newNodes.length,
          edgesCount: newEdges.length
        });

        // 检查边结构的有效性并断言
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

        // 直接设置节点和边，而不是使用函数形式
        try {
          // 如果是替换模式，直接设置
          if (!shouldAppend) {
            setNodes(newNodes);
            setEdges(validEdges); // 只使用有效边
            console.log('Replaced nodes and edges with new ones');
          } 
          // 如果是追加模式，合并现有和新的
          else {
            // 确保当前节点和边是数组
            const currentNodes = Array.isArray(nodes) ? nodes : [];
            const currentEdges = Array.isArray(edges) ? edges : [];
            setNodes([...currentNodes, ...newNodes]);
            setEdges([...currentEdges, ...validEdges]); // 只使用有效边
            console.log('Appended new nodes and edges to existing ones');
          }
        } catch (error) {
          console.error('Error setting nodes or edges:', error);
        }
        
        // 如果是追加模式，合并 agents 到 teamConfig
        if (shouldAppend) {
          setTeamConfig((prev: any) => {
            // 只更新 agents 数组，保留其他配置不变
            return {
              ...prev,
              // 更新团队名称，优先使用配置中的名称
              name: config.name || prev.name,
              agents: [
                ...prev.agents,
                ...(config.agents || []).map((agent: any) => ({
                  ...agent,
                  _sourceConfig: config.name || filePath.split('/').pop()
                }))
              ]
            };
          });
        }
        
        showNotification('success', 
          `Configuration ${shouldAppend ? 'added' : 'loaded'}: ${config.name}`
        );
      } else if (fileSelectorType === 'prompt') {
        // 处理提示文件 - 继续使用 loadFile
        const data = await loadFile(filePath);
        const promptContent = data.content as string;
        
        // 获取当前选中的节点
        if (selectedNode && selectedNode.type === 'agent') {
          // 如果有选中的节点，则更新节点的 prompt
          onNodeDataUpdate({
            ...selectedNode.data,
            prompt: shouldAppend 
              ? (selectedNode.data.prompt + '\n\n' + promptContent) // 追加模式：添加到现有内容后
              : promptContent // 替换模式：完全替换现有内容
          });
          
          showNotification('success', 
            `Prompt ${shouldAppend ? 'appended to' : 'replaced in'} agent: ${selectedNode.data.name}`
          );
        } else {
          // 如果没有选中节点，则更新团队提示
          setTeamConfig((prev: any) => ({
            ...prev,
            team_prompt: shouldAppend 
              ? (prev.team_prompt + '\n\n' + promptContent) // 追加模式：添加到现有内容后
              : promptContent // 替换模式：完全替换现有内容
          }));
          
          showNotification('success', 
            `Prompt ${shouldAppend ? 'appended to' : 'replaced in'} team configuration`
          );
        }
      }
      
      closeFileSelector();
    } catch (error) {
      console.error('Error loading file:', error);
      showNotification('error', 
        `Error loading file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [
    fileSelectorType, nodes, setNodes, setTeamConfig, 
    selectedNode, onNodeDataUpdate, showNotification, closeFileSelector
  ]);

  // Handler functions for file selectors
  const handleConfigSelect = useCallback((filePath: string) => {
    loadFileFromServer(filePath, true);
  }, [loadFileFromServer]);
  
  const handleConfigReplace = useCallback((filePath: string) => {
    loadFileFromServer(filePath, false);
  }, [loadFileFromServer]);
  
  const handlePromptSelect = useCallback((filePath: string) => {
    loadFileFromServer(filePath, true);
  }, [loadFileFromServer]);
  
  const handlePromptReplace = useCallback((filePath: string) => {
    loadFileFromServer(filePath, false);
  }, [loadFileFromServer]);

  return {
    loadFileFromServer,
    handleConfigSelect,
    handleConfigReplace,
    handlePromptSelect,
    handlePromptReplace
  };
}; 