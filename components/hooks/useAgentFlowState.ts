import { useState } from 'react';
import { useNodesState, useEdgesState, ReactFlowInstance } from 'reactflow';
import { FileInfo, TeamConfig, Notification } from '../../types';
import { FileSelectorType } from '../../types/agentFlow';

// Default team config
const defaultTeamConfig: TeamConfig = {
  name: "new_team",
  team_type: "round_robin",
  team_prompt: "",
  agents: [],
  duration: 0
};

export const useAgentFlowState = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);
  const [teamConfig, setTeamConfig] = useState<TeamConfig>(defaultTeamConfig);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [configFiles, setConfigFiles] = useState<FileInfo[]>([]);
  const [promptFiles, setPromptFiles] = useState<FileInfo[]>([]);
  const [showConfigSelector, setShowConfigSelector] = useState(false);
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [fileSelectorType, setFileSelectorType] = useState<FileSelectorType>('config');
  const [sidebarWidth, setSidebarWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  
  // Show notification with auto-dismiss
  const showNotification = (type: 'success' | 'error' | 'info', message: string, duration = 3000) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), duration);
  };

  // File selector management
  const openFileSelector = (type: FileSelectorType) => {
    setFileSelectorType(type);
    if (type === 'config') {
      setShowConfigSelector(true);
    } else if (type === 'prompt') {
      setShowPromptSelector(true);
    }
  };
  
  const closeFileSelector = () => {
    setShowConfigSelector(false);
    setShowPromptSelector(false);
  };

  return {
    // States
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    selectedNode, setSelectedNode,
    selectedNodes, setSelectedNodes,
    teamConfig, setTeamConfig,
    notification,
    isConnectMode, setIsConnectMode,
    reactFlowInstance, setReactFlowInstance,
    configFiles, setConfigFiles,
    promptFiles, setPromptFiles,
    showConfigSelector, setShowConfigSelector,
    showPromptSelector, setShowPromptSelector,
    fileSelectorType, setFileSelectorType,
    sidebarWidth, setSidebarWidth,
    isResizing, setIsResizing,
    
    // Helper functions
    showNotification,
    openFileSelector,
    closeFileSelector
  };
}; 