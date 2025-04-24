import { useCallback, useEffect } from 'react';
import { getConfigFiles, getPromptFiles, loadFile, loadConfigRecursively } from '../../services/api';
import { FileSelectorType } from '../../types/agentFlow';
import { FileInfo } from '../../types';
import { useStore } from '../../stores/StoreContext';
import { useNodeStore } from './useStore';

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
  onNodeDataUpdate: (data: any) => void
) => {
  const { uiStore } = useStore();
  const nodeStore = useNodeStore();
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
        
        // 如果不是追加模式，则重置teamConfig
        if (!shouldAppend) {
          setTeamConfig({
            name: config.name || "new_team",
            team_type: config.team_type || "round_robin",
            team_prompt: config.team_prompt || "",
            agents: [],
            duration: config.duration || 0
          });
        }
        
        nodeStore.createNodesAndEdgesFromConfig(config, filePath, shouldAppend);
        
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
        
        uiStore.showNotification('success', 
          `Configuration ${shouldAppend ? 'added' : 'loaded'}: ${config.name}`
        );

        closeFileSelector();
      } 
    } catch (error) {
      console.error('Error loading file:', error);
      uiStore.showNotification('error', 
        `Error loading file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [
    fileSelectorType, nodes, setNodes, edges, setEdges, setTeamConfig, 
    selectedNode, onNodeDataUpdate, uiStore, closeFileSelector, nodeStore
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