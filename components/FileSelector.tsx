'use client';

import React, { useState, ChangeEvent } from 'react';
import { FileInfo } from '../types';

interface FileSelectorProps {
  files: FileInfo[];
  onSelect: (path: string) => void;
  onReplace: (path: string) => void;
  onClose: () => void;
  type: 'config' | 'prompt';
}

export function FileSelector({ files, onSelect, onReplace, onClose, type }: FileSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="file-selector-overlay">
      <div className="file-selector">
        <div className="file-selector-header">
          <h2>{type === 'config' ? 'Load Configuration' : 'Load Prompt'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="file-selector-search">
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="file-list">
          {filteredFiles.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => (
                  <tr key={file.path}>
                    <td>{file.name}</td>
                    <td>{formatSize(file.size)}</td>
                    <td>{formatDate(file.modified)}</td>
                    <td>
                      <button 
                        className="button small-button"
                        onClick={() => onSelect(file.path)}
                        style={{ marginRight: '5px' }}
                      >
                        Add
                      </button>
                      <button 
                        className="button small-button"
                        onClick={() => onReplace(file.path)}
                      >
                        Replace All
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-files">
              {searchTerm ? 'No matching files found.' : 'No files available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 