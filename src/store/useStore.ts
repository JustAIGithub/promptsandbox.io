import {
	Connection,
	Edge,
	EdgeChange,
	Node,
	NodeChange,
	OnNodesChange,
	OnEdgesChange,
	OnConnect,
	applyNodeChanges,
	applyEdgeChanges,
	OnEdgesDelete,
	NodeMouseHandler,
	ReactFlowInstance,
} from 'reactflow';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import initialEdges from './initialEdges';
import initialNodes from './initialNodes';
import onAdd from './onAdd';
import onConnect from './onConnect';
import onEdgesDelete from './onEdgesDelete';
import onPlaceholderAdd from './onPlaceholderAdd';
import storage from './storage';
import updateNode from './updateNode';
import { DocumentDbSchema, SimpleWorkflow } from '../db/dbTypes';
import {
	CustomNode,
	InputNode,
	LLMPromptNodeDataType,
	NodeTypesEnum,
	TextInputNodeDataType,
} from '../nodes/types/NodeTypes';
import { runNode, traverseTree } from '../utils/Tree';

export type UseStoreSetType = (
	partial: RFState | Partial<RFState> | ((state: RFState) => RFState | Partial<RFState>),
	replace?: boolean | undefined,
) => void;

export interface RFState {
	documents: DocumentDbSchema[];
	setDocuments: (documents: DocumentDbSchema[]) => void;
	workflows: {
		id: string;
		name: string;
	}[];
	setWorkflows: (workflows: { id: string; name: string }[]) => void;
	currentWorkflow: SimpleWorkflow | null;
	setCurrentWorkflow: (workflow: { id: string; user_id: string; name: string } | null) => void;
	reactFlowInstance: ReactFlowInstance | null;
	setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
	uiErrorMessage: string | null;
	unlockGraph: boolean;
	clearGraph: () => void;
	setUiErrorMessage: (message: string | null) => void;
	nodes: CustomNode[];
	edges: Edge[];
	setNodes: (nodes: CustomNode[]) => void;
	setEdges: (edges: Edge[]) => void;
	selectedNode: CustomNode | null;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	deleteEdges: (sourceHandle: string) => void;
	onEdgesDelete: OnEdgesDelete;
	onNodeDragStop: NodeMouseHandler;
	onConnect: OnConnect;
	onAdd: (
		type: NodeTypesEnum,
		position: {
			x: number;
			y: number;
		},
		parentNode?: string,
	) => void;
	onPlaceholderAdd: (placeholderId: string, type: NodeTypesEnum) => void;
	getNodes: (inputs: string[]) => CustomNode[];

	// TODO: type this
	updateNode: any;
	updateInputExample: any;
	traverseTree: (openAiKey: string) => Promise<void>;
	runNode: (node: CustomNode, openAiKey: string) => Promise<void>;
	clearAllNodeResponses: () => void;
}

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useStore = create<RFState>()(
	persist(
		(set, get) => ({
			documents: [],
			setDocuments: (documents: DocumentDbSchema[]) => {
				set({
					documents,
				});
			},
			reactFlowInstance: null,
			setReactFlowInstance: (instance: ReactFlowInstance | null) => {
				set({
					reactFlowInstance: instance,
				});
			},
			workflows: [],
			setWorkflows: (workflows: { id: string; name: string }[]) => {
				set({
					workflows,
				});
			},
			currentWorkflow: null,
			setCurrentWorkflow: (
				workflow: { id: string; user_id: string; name: string } | null,
			) => {
				set({
					currentWorkflow: workflow,
				});
			},
			uiErrorMessage: null,
			clearGraph: () => {
				set({
					nodes: [],
					edges: [],
					selectedNode: null,
				});
			},
			chatSessions: {},
			unlockGraph: true,
			openAIApiKey: null,
			// get nodes from local storage or use initial nodes
			nodes: initialNodes,
			edges: initialEdges,
			setNodes: (nodes: CustomNode[]) => {
				set({
					nodes,
				});
			},
			setEdges: (edges: Edge[]) => {
				set({
					edges,
				});
			},
			selectedNode: null,
			setUiErrorMessage: (message: string | null) => {
				set({
					uiErrorMessage: message,
				});
			},
			onNodeDragStop: (_: React.MouseEvent<Element, MouseEvent>, node: CustomNode) => {
				set({
					selectedNode: node,
				});
			},
			onNodesChange: (changes: NodeChange[]) => {
				const nodes = get().nodes;
				const selectedNode = get().selectedNode;
				const isSelectedNodeDeleted = changes.some(
					(change) => change.type === 'remove' && change.id === selectedNode?.id,
				);
				const update: any = {
					nodes: applyNodeChanges(changes, nodes),
				};
				if (isSelectedNodeDeleted) {
					update.selectedNode = null;
				}
				set(update);
			},
			onEdgesChange: (changes: EdgeChange[]) => {
				set({
					edges: applyEdgeChanges(changes, get().edges),
				});
			},
			deleteEdges: (sourceHandle: string) => {
				const edges = get().edges;
				const newEdges = edges.filter((edge) => edge.sourceHandle !== sourceHandle);
				set({
					edges: newEdges,
				});
			},
			onConnect: (connection: Connection) => {
				return onConnect(get, set, connection);
			},
			onEdgesDelete: (edges: Edge[]) => {
				return onEdgesDelete(get, set, edges);
			},
			onAdd: (
				type: NodeTypesEnum,
				position: {
					x: number;
					y: number;
				},
				parentNode?: string,
			) => {
				return onAdd(get, set, type, position, parentNode);
			},
			onPlaceholderAdd: (placeholderId: string, type: NodeTypesEnum) => {
				return onPlaceholderAdd(get, set, placeholderId, type);
			},
			getNodes: (nodeIds: string[]) => {
				const nodes = get().nodes;
				if (nodeIds.length === 0) {
					return [];
				}

				const inputNodes = nodes.filter((node) => nodeIds.includes(node.id));

				return inputNodes as InputNode[];
			},
			updateNode: (
				nodeId: string,
				data: LLMPromptNodeDataType & TextInputNodeDataType,
				newPosition?: { mode: 'add' | 'set'; x: number; y: number },
			) => {
				return updateNode(get, set, nodeId, data, newPosition);
			},
			updateInputExample: (nodeId: string, inputId: string, value: string, index: number) => {
				let selectedNode: Node | null = null;
				const nodes = get().nodes.map((node) => {
					if (node.id === nodeId) {
						node.data.inputs.handleInputExampleChange(inputId, value, index);
						selectedNode = node;
					}

					return node;
				});

				set({
					nodes,
					selectedNode,
				});
			},
			traverseTree: (openAiKey: string): Promise<void> => {
				return traverseTree(get, set, openAiKey);
			},
			runNode: (node: CustomNode, openAiKey: string): Promise<void> => {
				return runNode(node, get, set, openAiKey);
			},
			clearAllNodeResponses: () => {
				const nodes = get().nodes;
				const updatedNodes = nodes.map((node) => {
					node.data.response = '';
					return node;
				});
				set({
					nodes: updatedNodes,
				});
			},
		}),
		{
			name: 'promptsandbox.io',
			storage,
		},
	),
);

export const selector = (state: RFState) => ({
	...state,
});

export default useStore;
