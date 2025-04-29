'use client';

import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/StoreContext';
import { buildTeamConfigFromNodes, cleanConfigForSave } from '../services/node';
import { saveConfig } from '../services/api';

// Components
import { NodeEditor } from './NodeEditor';
import { TeamConfigEditor } from './TeamConfigEditor';
import { AgentNode } from './AgentNode';
import { TeamNode } from './TeamNode';
import { FileSelector } from './FileSelector';
import Notification from './Notification';
import ThreadViewer from './ThreadViewer';

// Hooks
import {
  useAgentFlowState,
  useNodeOperations,
  useEdgeOperations,
  useTeamConfig,
  useFileOperations,
  useSidebar
} from './hooks';

// Constants
import { 
  AVAILABLE_TOOLS, 
  AVAILABLE_MODELS, 
  DEFAULT_CONNECTION_LINE_STYLE, 
  DEFAULT_EDGE_OPTIONS,
  NODE_TYPE_KEYS
} from './constants';
import { log } from 'console';

// Define node types for ReactFlow
const nodeTypes = {
  agent: AgentNode,
  team: TeamNode
};

const AgentFlow: React.FC = observer(() => {
  // 使用MobX store
  const { nodeStore, configStore, uiStore, threadStore } = useStore();
  
  // 添加通知状态监听
  useEffect(() => {
    console.log('uiStore.notification 变化:', uiStore.notification);
  }, [uiStore.notification]);
  
  // 仍使用useAgentFlowState获取其他状态，后续将逐步替换
  const {
    isConnectMode, setIsConnectMode,
    configFiles, setConfigFiles,
    promptFiles, setPromptFiles,
    showConfigSelector, setShowConfigSelector,
    showPromptSelector, setShowPromptSelector,
    fileSelectorType, setFileSelectorType,
    sidebarWidth, setSidebarWidth,
    isResizing, setIsResizing,
    showNotification,
    openFileSelector,
    closeFileSelector
  } = useAgentFlowState();

  // 我们仍然使用部分现有的hooks，后续会进一步替换
  const {
    onAddNode,
    onDeleteNode,
    onNodeDataUpdate,
    alignNodes
  } = useNodeOperations(
    nodeStore.nodes,
    nodeStore.edges,
    nodeStore.setNodes,
    nodeStore.setEdges,
    nodeStore.selectedNode,
    nodeStore.setSelectedNode,
    nodeStore.selectedNodes,
    nodeStore.setSelectedNodes,
    () => {}  // 暂时使用空函数替代updateAgentsOrder
  );

  // Edge operations
  const {
    onConnect,
    onEdgeClick,
    getEdgeLabel
  } = useEdgeOperations(
    nodeStore.nodes,
    nodeStore.edges,
    nodeStore.setEdges,
    () => {}  // 暂时使用空函数替代updateAgentsOrder
  );

  // File operations
  const {
    loadFileFromServer,
    handleConfigSelect,
    handleConfigReplace,
    handlePromptSelect,
    handlePromptReplace
  } = useFileOperations(
    fileSelectorType,
    nodeStore.nodes,
    nodeStore.setNodes,
    nodeStore.edges,
    nodeStore.setEdges,
    nodeStore.selectedNode,
    configStore.setTeamConfig,  // 使用ConfigStore的方法
    configStore.teamConfig,     // 使用ConfigStore的状态
    setConfigFiles,
    setPromptFiles,
    closeFileSelector,
    onNodeDataUpdate
  );

  // Sidebar resizing
  const {
    reactFlowWrapperRef,
    sidebarRef,
    startResizing,
    resize
  } = useSidebar(
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    setIsResizing
  );

  // Toggle connection mode
  const toggleConnectMode = useCallback(() => {
    setIsConnectMode(!isConnectMode);
    uiStore.showNotification(
      'info',
      !isConnectMode 
        ? '已进入连接模式：拖动节点上的连接点到另一个节点创建连接' 
        : '已退出连接模式',
      3000
    );
  }, [isConnectMode, setIsConnectMode, uiStore]);

  // Handle node click - 使用MobX store
  const onNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
    // If not holding shift key, only select the clicked node
    if (!(event.nativeEvent as MouseEvent).shiftKey) {
      nodeStore.setSelectedNode(node);
    }
  }, [nodeStore]);
  
  // Handle selection change - 使用MobX store
  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: ReactFlowNode[] }) => {
    // Update multi-select nodes state
    nodeStore.setSelectedNodes(selectedNodes);
    
    // If only one node is selected, set it as the current editing node
    if (selectedNodes.length === 1) {
      nodeStore.setSelectedNode(selectedNodes[0]);
    } else if (selectedNodes.length > 1) {
      // If multiple nodes are selected, clear single node selection
      nodeStore.setSelectedNode(null);
    }
  }, [nodeStore]);

  // 记录节点状态变化
  useEffect(() => {
    console.log('ReactFlow nodes changed:', {
      count: nodeStore.nodes.length,
      isArray: Array.isArray(nodeStore.nodes),
      firstNode: nodeStore.nodes.length > 0 ? {...nodeStore.nodes[0]} : null
    });
  }, [nodeStore.nodes]);

  return (
    <div className="app-container">
      <div className="toolbar">
        <div>
          <button className="button" onClick={() => onAddNode('agent')}>Add Agent</button>
          <button className="button" onClick={() => onAddNode('team')}>Add Team</button>
          {(nodeStore.selectedNode || nodeStore.selectedNodes.length > 0) && (
            <button className="button" onClick={onDeleteNode}>
              Delete {nodeStore.selectedNodes.length > 1 ? `(${nodeStore.selectedNodes.length} nodes)` : 'Node'}
            </button>
          )}
          <button 
            className={`button ${isConnectMode ? 'active-button' : ''}`} 
            onClick={toggleConnectMode}
            title="进入/退出连接模式"
          >
            {isConnectMode ? '退出连接模式' : '连接节点'}
          </button>
          <button 
            className="button" 
            onClick={() => threadStore.setShowThreadViewer(true)}
            title="查看执行结果"
          >
            Thread Viewer
          </button>
        </div>
        <div>
          <button className="button" onClick={() => openFileSelector('config')}>
            Load Config
          </button>
          <button className="button" onClick={() => openFileSelector('prompt')}>
            Load Prompt
          </button>
        </div>
      </div>
      
      <div className="app-content" onMouseMove={resize}>
        <div className="canvas-container" ref={reactFlowWrapperRef}>
          <ReactFlow
            key="flow"
            nodes={Array.isArray(nodeStore.nodes) ? nodeStore.nodes : []}
            edges={Array.isArray(nodeStore.edges) ? nodeStore.edges : []}
            onNodesChange={nodeStore.onNodesChange}
            onEdgesChange={nodeStore.onEdgesChange}
            onConnect={onConnect}
            onInit={instance => {
              console.log('ReactFlow initialized with instance:', instance);
              
              if (!instance) {
                console.warn('ReactFlow instance is null or undefined');
                return;
              }
              
              try {
                nodeStore.setReactFlowInstance(instance);
                console.log('ReactFlow instance set to NodeStore');
                
                // 强制布局重新计算
                setTimeout(() => {
                  instance.fitView({ padding: 0.2 });
                  console.log('ReactFlow fitView called');
                }, 200);
              } catch (error) {
                console.error('Error during ReactFlow initialization:', error);
              }
            }}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            edgesFocusable={true}
            edgesUpdatable={true}
            elementsSelectable={true}
            deleteKeyCode="Delete"
            fitView
            selectionMode={"default" as any}
            multiSelectionKeyCode="Shift"
            selectionOnDrag={true}
            selectionKeyCode={null}
            connectionMode={(isConnectMode ? "strict" : "loose") as any}
            connectionLineStyle={DEFAULT_CONNECTION_LINE_STYLE}
            connectionLineType={"bezier" as any}
            snapToGrid={true}
            snapGrid={[20, 20]}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS as any}
          >
            <Controls />
            <Background />
            {isConnectMode && (
              <div className="connect-mode-indicator">
                连接模式：拖动节点上的连接点创建连接
              </div>
            )}
          </ReactFlow>
        </div>
        
        <div className="sidebar-resizer" onMouseDown={startResizing}></div>
        
        <div className="sidebar" ref={sidebarRef} style={{ width: `${sidebarWidth}px` }}>
          {nodeStore.selectedNode && (
            <>
              <div className="sidebar-title">节点编辑</div>
              <NodeEditor
                availableTools={AVAILABLE_TOOLS}
                availableModels={AVAILABLE_MODELS}
              />
            </>
          )}
          
        </div>
      </div>
      
      {/* 使用新的Notification组件 */}
      <Notification />

      {/* 完整响应查看器 */}
      {threadStore.showThreadViewer && (
        <ThreadViewer
          data={threadStore.currentExecution}
          title={threadStore.currentExecution ? 
            `团队 ${threadStore.currentExecution.team_name} 运行结果` : 
            '执行结果查看器'}
          onClose={() => threadStore.setShowThreadViewer(false)}
        />
      )}

      {showConfigSelector && (
        <FileSelector
          files={configFiles}
          onSelect={handleConfigSelect}
          onReplace={handleConfigReplace}
          onClose={() => setShowConfigSelector(false)}
          type="config"
        />
      )}

      {showPromptSelector && (
        <FileSelector
          files={promptFiles}
          onSelect={handlePromptSelect}
          onReplace={handlePromptReplace}
          onClose={() => setShowPromptSelector(false)}
          type="prompt"
        />
      )}
    </div>
  );
});

export default function FlowWithProvider() {
  return (
    <ReactFlowProvider>
      <AgentFlow />
    </ReactFlowProvider>
  );
} 