import React, { createContext, useContext } from 'react';
import { RootStore } from './RootStore';

// 创建根Store的实例
export const rootStore = new RootStore();

// 仅在浏览器环境中将rootStore添加到window对象
if (typeof window !== 'undefined') {
  // @ts-ignore
  window["rootStore"] = rootStore;
}

// 创建React上下文
const StoreContext = createContext<RootStore>(rootStore);

// 提供一个hook来使用Store
export const useStore = () => useContext(StoreContext);

// Store提供者组件
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
}; 