import { makeAutoObservable } from 'mobx';
import { IRootStore } from './NodeStore';

// Define thread types
export type ThreadEventType = 'ToolCallRequestEvent' | 'ToolCallExecutionEvent' | 'ToolCallSummaryMessage' | 'TextMessage';

// Define thread content structure
export interface ThreadEvent {
  source: string;
  models_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null;
  metadata: Record<string, any>;
  content: any;
  type: ThreadEventType;
  timestamp?: string;
}

// Define execution result structure
export interface ExecutionResult {
  id: string;
  team_name: string;
  timestamp: string;
  agents: {
    [agentName: string]: ThreadEvent[];
  };
  status: 'completed' | 'running' | 'error';
  error?: string;
}

export class ThreadStore {
  executionResults: ExecutionResult[] = [];
  currentExecutionId: string | null = null;
  showThreadViewer: boolean = false;
  
  rootStore: IRootStore;

  constructor(rootStore: IRootStore) {
    this.rootStore = rootStore;
    
    makeAutoObservable(this, {
      rootStore: false
    });
  }
  
  /**
   * Add a new execution result
   */
  addExecutionResult = (teamName: string): string => {
    const id = `exec_${Date.now()}`;
    const result: ExecutionResult = {
      id,
      team_name: teamName,
      timestamp: new Date().toISOString(),
      agents: {},
      status: 'running'
    };
    
    this.executionResults.unshift(result);
    this.currentExecutionId = id;
    
    return id;
  };
  
  /**
   * Update the status of an execution
   */
  updateExecutionStatus = (executionId: string, status: 'completed' | 'running' | 'error', error?: string) => {
    const execution = this.executionResults.find(er => er.id === executionId);
    if (execution) {
      execution.status = status;
      if (error) {
        execution.error = error;
      }
    }
  };
  
  /**
   * Add a thread event to an agent in an execution
   */
  addThreadEvent = (executionId: string, agentName: string, event: ThreadEvent) => {
    const execution = this.executionResults.find(er => er.id === executionId);
    if (!execution) return;
    
    // Ensure agent exists in the execution
    if (!execution.agents[agentName]) {
      execution.agents[agentName] = [];
    }
    
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    
    // Add thread event directly to the agent's threads array
    execution.agents[agentName].push(event);
  };
  
  /**
   * Parse and add thread event from JSON string
   */
  parseAndAddThreadEvent = (executionId: string, agentName: string, eventJson: string) => {
    try {
      const event = JSON.parse(eventJson) as ThreadEvent;
      this.addThreadEvent(executionId, agentName, event);
      return true;
    } catch (error) {
      console.error('Failed to parse thread event:', error);
      return false;
    }
  };
  
  /**
   * Clear all execution results
   */
  clearResults = () => {
    this.executionResults = [];
    this.currentExecutionId = null;
  };
  
  /**
   * Get the current execution result
   */
  get currentExecution(): ExecutionResult | null {
    if (!this.currentExecutionId) return null;
    return this.executionResults.find(er => er.id === this.currentExecutionId) || null;
  }
  
  /**
   * Get threads for a specific agent in the current execution
   */
  get getAgentThreads() {
    return (agentName: string): ThreadEvent[] => {
      if (!this.currentExecution) return [];
      return this.currentExecution.agents[agentName] || [];
    };
  }
  
  /**
   * Get execution by ID
   */
  getExecutionById = (executionId: string): ExecutionResult | undefined => {
    return this.executionResults.find(er => er.id === executionId);
  };
  
  /**
   * Calculate token usage for an execution
   */
  calculateTokenUsage = (executionId: string): { promptTokens: number, completionTokens: number } => {
    const execution = this.getExecutionById(executionId);
    
    if (!execution) {
      return { promptTokens: 0, completionTokens: 0 };
    }
    
    let promptTokens = 0;
    let completionTokens = 0;
    
    Object.values(execution.agents).forEach(agent => {
      agent.forEach(thread => {
        if (thread.models_usage) {
          promptTokens += thread.models_usage.prompt_tokens || 0;
          completionTokens += thread.models_usage.completion_tokens || 0;
        }
      });
    });
    
    return { promptTokens, completionTokens };
  };

  /**
   * Process stream data from team execution
   */
  processStreamData = (executionId: string, data: any) => {
    // Handle system status updates
    if (data.status) {
      if (data.status === 'error') {
        this.updateExecutionStatus(executionId, 'error', data.message || 'Unknown error');
      } else if (data.status === 'completed') {
        this.updateExecutionStatus(executionId, 'completed');
      }
      // For other status updates, we don't change the execution status
      return;
    }

    // Handle agent output
    if (data.source && data.type) {
      this.addThreadEvent(executionId, data.source, {
        source: data.source,
        models_usage: data.models_usage,
        metadata: data.metadata || {},
        content: data.content,
        type: data.type,
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  };

  /**
   * Complete an execution
   */
  completeExecution = (executionId: string) => {
    const execution = this.getExecutionById(executionId);
    if (execution && execution.status === 'running') {
      this.updateExecutionStatus(executionId, 'completed');
    }
  };

  /**
   * Handle execution error
   */
  handleError = (executionId: string, error: Error) => {
    this.updateExecutionStatus(
      executionId, 
      'error', 
      error.message || 'Unknown error occurred'
    );
  };

  /**
   * Handle execution abort
   */
  handleAbort = (executionId: string) => {
    this.updateExecutionStatus(
      executionId, 
      'error', 
      'Execution aborted by user'
    );
  };

  /**
   * Set thread viewer visibility
   */
  setShowThreadViewer = (show: boolean) => {
    this.showThreadViewer = show;
  };

  /**
   * Set current execution result
   */
  setCurrentExecution = (execution: ExecutionResult) => {
    // Add the execution to results if not exists
    if (!this.executionResults.find(er => er.id === execution.id)) {
      this.executionResults.unshift(execution);
    }
    this.currentExecutionId = execution.id;
  };
} 