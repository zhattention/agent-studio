'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return <AuthProvider>{children}</AuthProvider>;
} 