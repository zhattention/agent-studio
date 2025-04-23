import { useCallback, useRef, useEffect } from 'react';

export const useSidebar = (
  sidebarWidth: number,
  setSidebarWidth: React.Dispatch<React.SetStateAction<number>>,
  isResizing: boolean,
  setIsResizing: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Start resizing the sidebar
  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
  }, [setIsResizing]);
  
  // Handle the actual resizing logic
  const resize = useCallback((e: React.MouseEvent) => {
    if (isResizing && reactFlowWrapperRef.current && sidebarRef.current) {
      const containerRect = reactFlowWrapperRef.current.parentElement?.getBoundingClientRect();
      if (containerRect) {
        const newWidth = Math.max(200, Math.min(800, containerRect.right - e.clientX));
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing, setSidebarWidth]);
  
  // Add and remove event listeners for mouse up to stop resizing
  useEffect(() => {
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setIsResizing]);

  return {
    reactFlowWrapperRef,
    sidebarRef,
    startResizing,
    resize
  };
}; 