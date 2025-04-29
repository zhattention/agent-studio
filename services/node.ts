import { Node } from 'reactflow';
import { TeamConfig } from '@/types';

/**
 * 从节点数据重建团队配置
 * 这个函数分析节点和边的关系，构建一个完整的团队配置对象
 */
export const buildTeamConfigFromNodes = (
  rootNode: Node<TeamConfig>,
  allNodes: Node[], 
  allEdges: any[],
  teamConfig: TeamConfig
): TeamConfig | undefined => {
  console.log('[NodeService] 开始从rootNode重建团队配置树', rootNode.data.name);
  
  // 2. 找出所有团队节点和Agent节点
  const teamNodes = allNodes.filter(node => node.type === 'team');
  const agentNodes = allNodes.filter(node => node.type === 'agent');
  
  
  // 3. 构建节点间的连接关系图（出边）
  const outConnections = new Map();
  // 构建节点间的连接关系图（入边）
  const inConnections = new Map();
  
  allEdges.forEach(edge => {
    // 出边连接
    if (!outConnections.has(edge.source)) {
      outConnections.set(edge.source, []);
    }
    outConnections.get(edge.source).push(edge.target);
    
    // 入边连接
    if (!inConnections.has(edge.target)) {
      inConnections.set(edge.target, []);
    }
    inConnections.get(edge.target).push(edge.source);
  });
  
  
  // 4. 寻找节点链上的所有连接节点 - 包括直接和间接连接
  const findAllConnectedNodes = (startNodeId: string, isTeamNode = false) => {
    const result = {
      agentNodes: [] as any[],
      teamNodes: [] as any[]
    };
    
    // 已访问的节点ID，防止循环引用
    const visited = new Set<string>();
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // 对于非起始团队节点，按类型添加到结果
      if (!(isTeamNode && nodeId === startNodeId)) {
        if (node.type === 'agent') {
          result.agentNodes.push(node);
        } else if (node.type === 'team') {
          result.teamNodes.push(node);
        }
      }
      
      // 继续遍历连接的节点
      const connectedIds = outConnections.get(nodeId) || [];
      for (const connectedId of connectedIds) {
        traverse(connectedId);
      }
    };
    
    // 从起始节点开始遍历
    traverse(startNodeId);
    
    return result;
  };
  
  // 5. 递归构建团队配置树
  const buildTeamConfig = (teamNodeId: string, depth = 0, processedTeams = new Set<string>()) => {
    // 防止重复处理同一个团队
    if (processedTeams.has(teamNodeId)) {
      console.log(`[NodeService] [${'  '.repeat(depth)}] 团队节点已处理过，跳过:`, teamNodeId);
      return null;
    }
    processedTeams.add(teamNodeId);
    
    const teamNode = teamNodes.find(node => node.id === teamNodeId);
    if (!teamNode) {
      console.log(`[NodeService] [${'  '.repeat(depth)}] 未找到团队节点:`, teamNodeId);
      return null;
    }
    
    console.log(`[NodeService] [${'  '.repeat(depth)}] 开始构建团队 "${teamNode.data.name}" 配置`);
    
    // 找出团队关联的所有节点（按链式关系查找）
    const allConnected = findAllConnectedNodes(teamNodeId, true);
    
    console.log(`[NodeService] [${'  '.repeat(depth)}] 团队 "${teamNode.data.name}" 链式连接了 ${allConnected.agentNodes.length} 个agent节点, ${allConnected.teamNodes.length} 个team节点`);
    
    // 初始化agents数组
    const agents: any[] = [];
    
    // 使用一个Map来保存节点ID到它在agents数组中索引的映射
    const nodeIdToIndex = new Map<string, number>();
    
    // 首先处理所有直接连接到团队的agent节点
    const directAgentNodeIds = outConnections.get(teamNodeId) || [];
    const directAgentNodes = allConnected.agentNodes.filter(node => 
      directAgentNodeIds.includes(node.id)
    );
    
    console.log(`[NodeService] [${'  '.repeat(depth)}] 团队 "${teamNode.data.name}" 直接连接了 ${directAgentNodes.length} 个agent节点`);
    
    // 处理直接连接的团队节点（子团队）
    const directTeamNodeIds = outConnections.get(teamNodeId) || [];
    const directTeamNodes = allConnected.teamNodes.filter(node => 
      directTeamNodeIds.includes(node.id)
    );
    
    console.log(`[NodeService] [${'  '.repeat(depth)}] 团队 "${teamNode.data.name}" 直接连接了 ${directTeamNodes.length} 个team节点`);
    
    // 6. 创建一个函数，来确定节点的顺序
    // 通过寻找路径来确定节点顺序
    const getNodeChain = () => {
      const orderedNodes: any[] = [];
      const visited = new Set<string>();
      const teamConnections = new Map<string, string>(); // 记录agent到team的连接关系
      
      // 辅助函数：从一个节点开始，按连接顺序遍历
      const traverseChain = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const node = allNodes.find(n => n.id === nodeId);
        if (!node) return;
        
        // 只处理agent节点，不直接加入team节点（team将被作为team_cfg处理）
        if (node.type === 'agent') {
          orderedNodes.push(node);
          
          // 检查此agent是否连接到team节点
          const connectedIds = outConnections.get(node.id) || [];
          const connectedTeams = teamNodes.filter(teamNode => 
            connectedIds.includes(teamNode.id)
          );
          
          // 如果agent连接到team，记录这个关系
          if (connectedTeams.length > 0) {
            teamConnections.set(node.id, connectedTeams[0].id);
            
            // 不要继续沿着team节点遍历，这会在其他地方处理
            // 只处理连接到其他agent的情况
            const nonTeamConnections = connectedIds.filter(id => {
              const connNode = allNodes.find(n => n.id === id);
              return connNode && connNode.type === 'agent';
            });
            
            for (const connId of nonTeamConnections) {
              traverseChain(connId);
            }
          } else {
            // 如果没有连接到team，正常遍历所有连接节点
            for (const connectedId of connectedIds) {
              traverseChain(connectedId);
            }
          }
        } else if (node.type === 'team') {
          // 对于团队节点，不添加到orderedNodes，只继续遍历它的连接
          const connectedIds = outConnections.get(node.id) || [];
          for (const connectedId of connectedIds) {
            traverseChain(connectedId);
          }
        }
      };
      
      // 从团队节点开始遍历
      traverseChain(teamNodeId);
      
      return { 
        orderedNodes, 
        teamConnections 
      };
    };
    
    // 获取按连接顺序排列的节点和agent-team连接关系
    const { orderedNodes: orderedAgents, teamConnections } = getNodeChain();
    
    console.log(`[NodeService] [${'  '.repeat(depth)}] 团队 "${teamNode.data.name}" 链式排序后有 ${orderedAgents.length} 个agent节点`);
    console.log(`[NodeService] [${'  '.repeat(depth)}] 发现 ${teamConnections.size} 个agent到team的连接`);
    
    // 7. 按顺序处理每个agent节点
    for (const agentNode of orderedAgents) {
      console.log(`[NodeService] [${'  '.repeat(depth)}] 处理agent节点: "${agentNode.data.name}" (${agentNode.id})`);
      
      const agentConfig = { ...agentNode.data };
      
      // 检查此agent是否连接到其他team（表示它有一个子团队）
      const connectedTeamId = teamConnections.get(agentNode.id);
      
      if (connectedTeamId) {
        const subTeamNode = teamNodes.find(node => node.id === connectedTeamId);
        
        if (subTeamNode) {
          console.log(`[NodeService] [${'  '.repeat(depth)}] Agent "${agentNode.data.name}" 连接到子团队: "${subTeamNode.data.name}"`);
          
          agentConfig.team_call = subTeamNode.data.name;
          agentConfig.team_cfg = buildTeamConfig(subTeamNode.id, depth + 1, processedTeams);
          
          console.log(`[NodeService] [${'  '.repeat(depth)}] 完成agent "${agentNode.data.name}" 的子团队配置构建`);
        }
      }
      
      // 添加到agents数组
      agents.push(agentConfig);
      nodeIdToIndex.set(agentNode.id, agents.length - 1);
    }
    
    // 8. 处理直接连接的子团队（不通过agent连接的情况）
    for (const subTeamNode of directTeamNodes) {
      // 如果已经通过agent处理过，则跳过
      let alreadyProcessed = false;
      for (const agent of agents) {
        if (agent.team_call === subTeamNode.data.name) {
          alreadyProcessed = true;
          break;
        }
      }
      
      if (!alreadyProcessed) {
        console.log(`[NodeService] [${'  '.repeat(depth)}] 处理直接子团队: "${subTeamNode.data.name}"`);
        
        const subTeamConfig = buildTeamConfig(subTeamNode.id, depth + 1, processedTeams);
        if (subTeamConfig) {
          // 创建一个虚拟agent，将子团队嵌套在其中
          console.log(`[NodeService] [${'  '.repeat(depth)}] 创建虚拟agent嵌套子团队 "${subTeamNode.data.name}"`);
          
          agents.push({
            name: `team_agent_${subTeamNode.data.name}`,
            team_call: subTeamNode.data.name,
            team_cfg: subTeamConfig,
            model: "virtual" // 标记为虚拟agent
          });
        }
      }
    }

    const teamNodeData = teamNode.data as TeamConfig;

    // 构建团队配置对象
    const teamConfig = {
      ...teamNodeData,
      agents
    };
    
    console.log(`[NodeService] [${'  '.repeat(depth)}] 完成团队 "${teamNode.data.name}" 配置构建, 包含 ${agents.length} 个agents`);
    return teamConfig;
  };
  
  const rootTeamConfig = buildTeamConfig(rootNode.id);
  if (rootTeamConfig) {
    return {
      ...teamConfig,
      ...rootTeamConfig
    };
  }
};

/**
 * 递归清理配置对象，移除不需要发送到后端的字段
 */
export const cleanConfigForSave = (config: any): any => {
  if (!config || typeof config !== 'object') {
    return config;
  }
  
  // 如果是数组，对每个元素递归清理
  if (Array.isArray(config)) {
    return config.map(item => cleanConfigForSave(item));
  }
  
  // 需要排除的字段列表
  const excludeFields = ['id', '_sourceConfig', '_parentTeam'];
  
  // 创建一个新对象，不包含排除字段
  const cleanedConfig: any = {};
  for (const key in config) {
    if (excludeFields.includes(key)) {
      console.log(`[NodeService] 清理配置 - 移除字段: ${key}`);
      continue;
    }
    
    // 递归清理子对象
    cleanedConfig[key] = cleanConfigForSave(config[key]);
  }
  
  return cleanedConfig;
};

/**
 * 从指定的团队节点创建配置并保存
 * @param teamNodeId 团队节点ID
 * @param allNodes 所有节点
 * @param allEdges 所有边
 * @param baseConfig 基础配置
 * @returns 构建的团队配置
 */
export const buildConfigFromTeamNode = (
  teamNodeId: string,
  allNodes: Node[],
  allEdges: any[],
  baseConfig: TeamConfig
): TeamConfig | undefined => {
  // 找出目标团队节点
  const teamNode = allNodes.find(node => node.id === teamNodeId && node.type === 'team');
  if (!teamNode) {
    console.error('[NodeService] 找不到指定的团队节点:', teamNodeId);
    return undefined;
  }
  
  console.log(`[NodeService] 开始从团队节点 "${teamNode.data.name}" 构建配置`);
  
  // 使用通用函数构建完整配置
  // 使用teamNode.data作为基础，确保保留团队名称等信息
  const updatedConfig = buildTeamConfigFromNodes(
    teamNode,
    allNodes,
    allEdges,
    { ...baseConfig, ...teamNode.data }
  );
  
  return updatedConfig;
};

/**
 * 保存特定团队节点的配置
 * @param teamNodeId 团队节点ID
 * @param allNodes 所有节点
 * @param allEdges 所有边
 * @param baseConfig 基础配置
 * @param saveConfigFn 保存配置的函数
 * @returns 是否保存成功
 */
export const saveTeamNodeConfig = async (
  teamNodeId: string,
  allNodes: Node[],
  allEdges: any[],
  baseConfig: TeamConfig,
): Promise<TeamConfig | null> => {
    const teamConfig = buildConfigFromTeamNode(teamNodeId, allNodes, allEdges, baseConfig);
    
    if (!teamConfig) {
      console.error('[NodeService] 无法构建团队配置，保存失败');
      throw new Error('无法构建团队配置，保存失败');
    }
    
    // 确保团队名称有效
    if (!teamConfig.name || teamConfig.name.trim() === '') {
      console.warn('[NodeService] 团队名称为空，设置为默认名称');
      teamConfig.name = `team_${new Date().getTime()}`;
    }
    
    // 清理配置，移除不必要的字段
    const cleanedConfig = cleanConfigForSave(teamConfig);
    
    // 使用传入的保存函数保存配置
    return cleanedConfig;
}; 