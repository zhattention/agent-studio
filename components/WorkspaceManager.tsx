import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/StoreContext';
import { getWorkspaceList, getWorkspaceVersions, loadWorkspace, deleteWorkspace } from '../services/api';

interface WorkspaceManagerProps {
  onClose: () => void;
}

interface Workspace {
  name: string;
  versions: {
    version: string;
    timestamp: number;
    nodes: any[];
    edges: any[];
  }[];
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = observer(({ onClose }) => {
  const { nodeStore, uiStore } = useStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const workspaceList = await getWorkspaceList();
      const workspacesWithVersions = await Promise.all(
        workspaceList.map(async (workspace: string) => {
          const versions = await getWorkspaceVersions(workspace);
          return {
            name: workspace,
            versions
          };
        })
      );
      setWorkspaces(workspacesWithVersions);
    } catch (error) {
      console.error('Error loading workspaces:', error);
      uiStore.showNotification('error', '加载工作区列表失败', 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (workspaceName: string, version: string) => {
    try {
      const workspace = await loadWorkspace(workspaceName, version);
      nodeStore.setNodes(workspace.nodes);
      nodeStore.setEdges(workspace.edges);
      uiStore.showNotification('success', `已加载工作区: ${workspaceName} (${version})`, 3000);
      onClose();
    } catch (error) {
      console.error('Error loading workspace:', error);
      uiStore.showNotification('error', '加载工作区失败', 3000);
    }
  };

  const handleDelete = async (workspaceName: string, version: string) => {
    try {
      await deleteWorkspace(workspaceName, version);
      await loadWorkspaces(); // Reload the list
      uiStore.showNotification('success', '工作区已删除', 3000);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      uiStore.showNotification('error', '删除工作区失败', 3000);
    }
  };

  if (loading) {
    return (
      <div className="workspace-manager">
        <div className="workspace-manager-header">
          <h2>工作区管理</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="workspace-manager">
      <div className="workspace-manager-header">
        <h2>工作区管理</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="workspace-list">
        {workspaces.length === 0 ? (
          <div className="no-workspaces">没有保存的工作区</div>
        ) : (
          workspaces.map((workspace) => (
            <div key={workspace.name} className="workspace-group">
              <div 
                className="workspace-name-header"
                onClick={() => setSelectedWorkspace(
                  selectedWorkspace === workspace.name ? null : workspace.name
                )}
              >
                <span>{workspace.name}</span>
                <span className="version-count">
                  {workspace.versions.length} 个版本
                </span>
              </div>
              {selectedWorkspace === workspace.name && (
                <div className="version-list">
                  {workspace.versions.map((version) => (
                    <div key={version.version} className="version-item">
                      <div className="version-info">
                        <div className="version-name">版本 {version.version}</div>
                        <div className="version-time">
                          {new Date(version.timestamp).toLocaleString()}
                        </div>
                        <div className="version-stats">
                          {version.nodes.length} 个节点, {version.edges.length} 个连接
                        </div>
                      </div>
                      <div className="version-actions">
                        <button 
                          className="load-button"
                          onClick={() => handleLoad(workspace.name, version.version)}
                        >
                          加载
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDelete(workspace.name, version.version)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default WorkspaceManager; 