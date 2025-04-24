import { useStore as useRootStore } from '../../stores/StoreContext';
import { NodeStore } from '../../stores/NodeStore';

/**
 * A hook that returns the NodeStore instance
 * @returns The NodeStore instance
 */
export const useNodeStore = (): NodeStore => {
  const { nodeStore } = useRootStore();
  return nodeStore;
};

/**
 * Re-export the root store hook for convenience
 */
export const useStore = useRootStore; 