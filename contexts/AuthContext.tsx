'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
      console.log('AuthContext: 开始登出...');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        console.log('AuthContext: 登出成功');
        setUser(null);
        router.push('/login');
      } else {
        console.error('AuthContext: 登出失败, 状态码:', response.status);
      }
    } catch (err) {
      console.error('AuthContext: 登出出错:', err);
      setError('Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 