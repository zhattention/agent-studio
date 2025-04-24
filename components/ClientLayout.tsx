'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

interface ClientLayoutProps {
  children: ReactNode;
}

/**
 * 客户端布局组件
 * 包含需要客户端功能的UI元素和AuthProvider
 */
export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
} 