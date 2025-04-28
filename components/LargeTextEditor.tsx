'use client';

import React, { useState } from 'react';

// 长文本编辑模态框组件
interface LargeTextEditorProps {
  initialText: string;
  title: string;
  onSave?: (text: string) => void;
  onClose: () => void;
  readOnly?: boolean;
  buttonText?: string;
}

const LargeTextEditor: React.FC<LargeTextEditorProps> = ({ 
  initialText, 
  title, 
  onSave, 
  onClose, 
  readOnly = false,
  buttonText = "确认"
}) => {
  const [text, setText] = useState(initialText);

  const handleSave = () => {
    if (onSave) {
      onSave(text);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-text-editor" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-actions">
            {!readOnly && onSave && (
              <button className="button primary-button save-button" onClick={handleSave}>
                {buttonText}
              </button>
            )}
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          <textarea 
            className="large-text-area"
            value={text} 
            onChange={(e) => setText(e.target.value)}
            placeholder={readOnly ? "无内容" : "在这里输入详细内容..."}
            readOnly={readOnly}
            autoFocus={!readOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default LargeTextEditor; 