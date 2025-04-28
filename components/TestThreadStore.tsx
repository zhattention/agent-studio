'use client';

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/StoreContext';
import { useThreadStore } from './hooks/useThreadStore';

/**
 * A simple component to test ThreadStore functionality
 */
const TestThreadStore: React.FC = observer(() => {
  const { threadStore, uiStore } = useStore();
  const threadStoreHook = useThreadStore();
  const [teamName, setTeamName] = useState('test_team');
  const [mockEvent, setMockEvent] = useState('{"source":"search","models_usage":{"prompt_tokens":100,"completion_tokens":50},"metadata":{},"content":"Test content","type":"TextMessage"}');
  
  // Create a new execution
  const handleCreateExecution = () => {
    try {
      const executionId = threadStoreHook.startExecution(teamName);
      uiStore.showNotification('success', `Created execution with ID: ${executionId}`, 3000);
    } catch (error) {
      uiStore.showNotification('error', `Error creating execution: ${(error as Error).message}`, 5000);
    }
  };
  
  // Add a mock thread event to the current execution
  const handleAddMockEvent = () => {
    const currentExecution = threadStore.currentExecution;
    if (!currentExecution) {
      uiStore.showNotification('error', 'No current execution', 3000);
      return;
    }
    
    try {
      const parsed = JSON.parse(mockEvent);
      threadStore.addThreadEvent(
        currentExecution.id,
        parsed.source || 'unknown',
        {
          source: parsed.source || 'unknown',
          models_usage: parsed.models_usage || null,
          metadata: parsed.metadata || {},
          content: parsed.content || '',
          type: parsed.type as any || 'TextMessage',
          timestamp: new Date().toISOString()
        }
      );
      
      uiStore.showNotification('success', 'Added mock event', 2000);
    } catch (error) {
      uiStore.showNotification('error', `Error adding mock event: ${(error as Error).message}`, 5000);
    }
  };
  
  // Mark the current execution as completed
  const handleCompleteExecution = () => {
    const currentExecution = threadStore.currentExecution;
    if (!currentExecution) {
      uiStore.showNotification('error', 'No current execution', 3000);
      return;
    }
    
    threadStore.updateExecutionStatus(currentExecution.id, 'completed');
    uiStore.showNotification('success', 'Execution marked as completed', 3000);
  };
  
  // Clear all execution results
  const handleClearExecutions = () => {
    threadStore.clearResults();
    uiStore.showNotification('info', 'Cleared all executions', 3000);
  };
  
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h1 className="text-xl font-bold mb-4">ThreadStore Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          Team Name:
          <input 
            type="text" 
            value={teamName} 
            onChange={e => setTeamName(e.target.value)}
            className="ml-2 p-2 border rounded"
          />
        </label>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          Mock Thread Event (JSON):
          <textarea 
            value={mockEvent} 
            onChange={e => setMockEvent(e.target.value)}
            className="block w-full mt-1 p-2 border rounded"
            rows={5}
          />
        </label>
      </div>
      
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={handleCreateExecution}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Execution
        </button>
        
        <button 
          onClick={handleAddMockEvent}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          disabled={!threadStore.currentExecution}
        >
          Add Mock Event
        </button>
        
        <button 
          onClick={handleCompleteExecution}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          disabled={!threadStore.currentExecution}
        >
          Complete Execution
        </button>
        
        <button 
          onClick={handleClearExecutions}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear All
        </button>
      </div>
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Current State:</h2>
        <div className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
          <pre className="text-sm">
            {JSON.stringify({
              currentExecutionId: threadStore.currentExecutionId,
              executionCount: threadStore.executionResults.length,
              executionResults: threadStore.executionResults
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
});

export default TestThreadStore; 