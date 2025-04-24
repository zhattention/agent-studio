'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_CONFIG } from '../config/auth.config';

interface User {
  username: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log('AuthContext: 开始获取用户资料...');
        
        const response = await fetch('/api/user/profile');
        console.log('AuthContext: 获取用户资料响应状态:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('AuthContext: 用户资料获取成功:', data.user?.username);
          setUser(data.user);
        } else {
          // If unauthorized or other error, clear user
          console.log('AuthContext: 未授权或其他错误, 状态码:', response.status);
          const errorData = await response.json().catch(() => ({}));
          console.log('AuthContext: 错误详情:', errorData);
          setUser(null);
        }
      } catch (err) {
        console.error('AuthContext: 获取用户资料失败:', err);
        setError('Failed to fetch user profile');
        setUser(null);
      } finally {
        console.log('AuthContext: 加载状态结束');
        setLoading(false);
      }
    };

    // 添加超时机制，确保不会永久加载
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('AuthContext: 请求超时，终止加载状态');
        setLoading(false);
        setError('Request timeout');
      }
    }, 5000); // 5秒超时

    fetchUserProfile();

    // 清除超时定时器
    return () => clearTimeout(timeoutId);
  }, []);

  const logout = async () => {
    try {
      // 清除本地状态
      setUser(null);
      
      // 尝试调用登出API
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
      } catch (fetchError) {
        // 捕获网络错误但继续执行
      }
      
      // 无论API调用是否成功，强制清除cookie
      document.cookie = `${AUTH_CONFIG.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      
      // 无论API调用是否成功，强制刷新页面到登录页
      window.location.href = '/login';
    } catch (err) {
      // 发生错误时，确保仍然清除cookie并重定向
      document.cookie = `${AUTH_CONFIG.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 