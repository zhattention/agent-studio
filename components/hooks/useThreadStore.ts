import { useCallback } from 'react';
import { useStore } from '../../stores/StoreContext';
import { ThreadEvent } from '../../stores/ThreadStore';

// Get global threadStore for direct access
const getGlobalThreadStore = () => {
  if (typeof window !== 'undefined' && window["rootStore"]) {
    return window["rootStore"].threadStore;
  }
  console.error('Global rootStore not available');
  return null;
};

/**
 * Hook for working with team execution threads
 */
export const useThreadStore = () => {
  const { threadStore, uiStore } = useStore();
  
  /**
   * Start a new team execution and return the execution ID
   */
  const startExecution = useCallback((teamName: string) => {
    // Use the global threadStore directly
    const globalThreadStore = getGlobalThreadStore();
    if (globalThreadStore) {
      return globalThreadStore.addExecutionResult(teamName);
    }
    return threadStore.addExecutionResult(teamName);
  }, [threadStore]);
  
  /**
   * Process a line from the team execution stream
   */
  const processResponseLine = useCallback((line: string, executionId: string) => {
    if (!line.trim()) {
      return { status: 'empty' };
    }
    
    try {
      const data = JSON.parse(line);
      const globalThreadStore = getGlobalThreadStore() || threadStore;
      
      // Handle system update messages
      if (data.status) {
        if (data.status === 'error') {
          globalThreadStore.updateExecutionStatus(executionId, 'error', data.message || 'Unknown error');
          return { status: 'system_error', message: data.message || 'An error occurred' };
        }
        
        if (data.status === 'completed') {
          globalThreadStore.updateExecutionStatus(executionId, 'completed');
          return { status: 'system_completed', message: data.message || 'Execution completed' };
        }
        
        return { 
          status: data.status === 'processing' || data.status === 'update' ? 'system_update' : 'system_unknown', 
          message: data.message || 'Processing...'
        };
      }
      
      // Handle agent output (thread events)
      if (data.source && data.type) {
        globalThreadStore.addThreadEvent(executionId, data.source, {
          source: data.source,
          models_usage: data.models_usage,
          metadata: data.metadata || {},
          content: data.content,
          type: data.type,
          timestamp: data.timestamp || new Date().toISOString()
        });
        
        return {
          status: 'agent_response',
          agentUpdated: data.source
        };
      }
      
      return { status: 'unknown_format', message: 'Received data in unknown format' };
      
    } catch (error) {
      console.error('Error processing team call response line:', error);
      console.log('Problematic line:', line);
      
      return {
        status: 'parse_error',
        message: `Error parsing response: ${(error as Error).message}`
      };
    }
  }, [threadStore]);
  
  /**
   * Get threads for a specific agent in an execution
   */
  const getAgentThreads = useCallback((executionId: string, agentName: string): ThreadEvent[] => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    const execution = globalThreadStore.getExecutionById(executionId);
    if (!execution) return [];
    return execution.agents[agentName]?.threads || [];
  }, [threadStore]);
  
  /**
   * Get all executions
   */
  const getAllExecutions = useCallback(() => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    return globalThreadStore.executionResults;
  }, [threadStore]);
  
  /**
   * Get an execution by ID
   */
  const getExecution = useCallback((executionId: string) => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    return globalThreadStore.getExecutionById(executionId);
  }, [threadStore]);
  
  /**
   * Get the current execution
   */
  const getCurrentExecution = useCallback(() => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    return globalThreadStore.currentExecution;
  }, [threadStore]);
  
  /**
   * Complete an execution (mark as completed)
   */
  const completeExecution = useCallback((executionId: string) => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    globalThreadStore.updateExecutionStatus(executionId, 'completed');
    uiStore.showNotification('success', 'Team execution completed', 3000);
  }, [threadStore, uiStore]);
  
  /**
   * Set execution error
   */
  const setExecutionError = useCallback((executionId: string, errorMessage: string) => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    globalThreadStore.updateExecutionStatus(executionId, 'error', errorMessage);
    uiStore.showNotification('error', `Team execution error: ${errorMessage}`, 5000);
  }, [threadStore, uiStore]);
  
  /**
   * Calculate token usage for an execution
   */
  const calculateTokenUsage = useCallback((executionId: string) => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    return globalThreadStore.calculateTokenUsage(executionId);
  }, [threadStore]);
  
  /**
   * Clear all execution results
   */
  const clearAllResults = useCallback(() => {
    const globalThreadStore = getGlobalThreadStore() || threadStore;
    globalThreadStore.clearResults();
    uiStore.showNotification('info', 'All execution results cleared', 3000);
  }, [threadStore, uiStore]);
  
  return {
    startExecution,
    processResponseLine,
    getAgentThreads,
    getAllExecutions,
    getExecution,
    getCurrentExecution,
    completeExecution,
    setExecutionError,
    calculateTokenUsage,
    clearAllResults
  };
}; 