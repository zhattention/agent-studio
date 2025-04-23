# Agent Flow Components

This directory contains the components for the Agent Flow visual editor, which allows users to create, configure, and manage agent systems visually.

## Structure

The components are organized as follows:

### Main Components

- `AgentFlow.tsx` - Main component that orchestrates the entire flow editor
- `AgentNode.tsx` - Component for rendering agent nodes in the flow 
- `TeamNode.tsx` - Component for rendering team nodes in the flow
- `NodeEditor.tsx` - Editor sidebar for configuring agent nodes
- `TeamConfigEditor.tsx` - Editor for team configurations
- `FileSelector.tsx` - Component for selecting config or prompt files

### Hooks

All custom hooks are located in the `hooks/` directory:

- `useAgentFlowState.ts` - Manages the main state of the flow editor
- `useNodeOperations.ts` - Operations related to nodes (add, delete, update)
- `useEdgeOperations.ts` - Operations related to edges (connections between nodes)
- `useTeamConfig.ts` - Manages team configuration state and operations
- `useFileOperations.ts` - File-related operations (loading, saving)
- `useSidebar.ts` - Sidebar resizing functionality

### Constants

- `constants.ts` - Common constants used throughout the components

## Organization

This structure follows a modular approach to separate concerns:

1. **UI Components** - Responsible for rendering the visual elements
2. **Hooks** - Contain the business logic and state management
3. **Constants** - Shared values used across components

By splitting the main AgentFlow component into smaller modules, we've made the code more maintainable, testable, and easier to understand. 