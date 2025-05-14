import React, { useState } from 'react';

interface WorkspaceNameDialogProps {
  onSave: (name: string) => void;
  onCancel: () => void;
}

const WorkspaceNameDialog: React.FC<WorkspaceNameDialogProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="workspace-name-dialog">
      <div className="dialog-content">
        <h3>保存工作区</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="workspace-name">工作区名称:</label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入工作区名称"
              autoFocus
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="save-button" disabled={!name.trim()}>
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceNameDialog; 