# AI Agent Flow Editor

A visual editor for creating and configuring AI agent team flows, built with Next.js and React Flow.

## Features

- Visual canvas for designing agent workflows
- Drag-and-drop interface for creating agents and connecting them
- Property editor to configure agent settings
- Save and load configurations from JSON files
- Real-time JSON preview

## Getting Started

### Prerequisites

Make sure you have Node.js installed on your system (version 14.x or higher).

### Installation

1. Navigate to the project directory:
   ```bash
   cd ai_agent/editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the development server:
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

For production build:
```bash
npm run build
npm start
```

## Using the Editor

1. Use the "Add Agent" and "Add Team" buttons to create nodes on the canvas.
2. Drag to reposition nodes.
3. Connect nodes by dragging from the bottom handle of one node to the top handle of another to establish execution order.
4. Click on a node to edit its properties in the sidebar.
5. Configure the overall team settings in the sidebar when no node is selected.
6. Save your configuration using the "Save" button or load an existing one with "Load".

## Node Types

### Agent Nodes

Agent nodes represent individual AI agents with the following properties:

- **Name**: Unique identifier for the agent
- **Model**: The AI model to use (e.g., GPT-4o-mini)
- **Tools**: The tools the agent can use
- **Prompt**: Instructions for the agent
- **Transition Prompt**: Instructions for the next agent in the flow

### Team Nodes

Team nodes represent sub-teams that can be referenced by other agents.

## Configuration Structure

The editor generates JSON configurations compatible with the AI agent system. The basic structure is:

```json
{
  "name": "team_name",
  "team_type": "round_robin",
  "team_prompt": "Instructions for the team",
  "agents": [
    {
      "name": "agent_name",
      "tools": ["tool1", "tool2"],
      "model": "openai/gpt-4o-mini",
      "prompt": "Agent instructions"
    }
  ],
  "duration": 0
}
```

## Flow Execution Types

- **round_robin**: Agents execute in sequence
- **tree**: Execution branches based on conditions
- **parallel**: Agents execute simultaneously

## Duration Settings

- **0**: One-time execution
- **-1**: Continuous execution until stopped
- **Positive number**: Interval in seconds between executions 