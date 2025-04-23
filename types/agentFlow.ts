import { Node, Edge, TeamConfig, AgentData, TeamData, Notification } from './index';
import { Connection, ReactFlowInstance } from 'reactflow';

// AgentFlow组件的props类型
export interface AgentFlowProps {}

// 处理函数类型
export type UpdateNodeDataHandler = (data: AgentData | TeamData) => void;
export type OnConnectHandler = (params: Connection) => void;
export type OnNodeClickHandler = (event: React.MouseEvent, node: Node) => void;
export type OnEdgeClickHandler = (event: React.MouseEvent, edge: Edge) => void;
export type OnSelectionChangeHandler = (params: { nodes: Node[] }) => void;
export type OnNodesChangeHandler = (changes: any[]) => void;
export type OnEdgesChangeHandler = (changes: any[]) => void;

// 文件选择处理函数类型
export type FileSelectHandler = (filePath: string) => void;
export type FileReplaceHandler = (filePath: string) => void;

// 调整大小处理程序类型
export type StartResizingHandler = (e: React.MouseEvent) => void;
export type StopResizingHandler = () => void;
export type ResizeHandler = (e: MouseEvent) => void;

// 节点对齐方向类型
export type AlignDirection = 'horizontal' | 'vertical' | 'grid';

// 其他类型常量
export type FileSelectorType = 'config' | 'prompt'; 