'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import NavBar from '@/components/NavBar';

// Dynamic import ReactFlow to avoid SSR issues
const ReactFlowWithNoSSR = dynamic(
  () => import('@/components/AgentFlow'),
  { ssr: false }
);

export default function Home() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [forceLoad, setForceLoad] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('Home: 用户未认证，重定向到登录页面');
      router.push('/login');
    }
  }, [user, loading, router]);

  // 添加调试显示
  useEffect(() => {
    console.log('Home: 渲染状态 -', { user, loading, error });
    
    // 如果超过3秒仍在加载，强制继续
    const timer = setTimeout(() => {
      if (loading) {
        console.log('Home: 加载超时，强制继续');
        setForceLoad(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [user, loading, error]);

  // 手动验证认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          console.log('Home: 手动验证成功');
          setForceLoad(true);
        }
      } catch (error) {
        console.error('Home: 手动验证失败', error);
      }
    };
    
    if (loading && !forceLoad) {
      checkAuth();
    }
  }, [loading, forceLoad]);

  // 继续加载，即使认证上下文仍在加载
  if (loading && !forceLoad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-xl mb-4">加载中...</div>
        <div className="text-sm text-gray-500">正在验证您的身份</div>
        <button 
          onClick={() => setForceLoad(true)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          跳过验证继续
        </button>
      </div>
    );
  }

  // Show error message if any
  if (error && !forceLoad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-xl mb-4 text-red-500">加载失败</div>
        <div className="text-sm text-gray-700 mb-4">{error}</div>
        <button 
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          返回登录页面
        </button>
        <button 
          onClick={() => setForceLoad(true)}
          className="mt-2 px-4 py-2 bg-gray-500 text-white rounded"
        >
          忽略错误继续
        </button>
      </div>
    );
  }

  // If not authenticated and not forced, show loading while redirecting
  if (!user && !forceLoad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-xl mb-4">重定向中...</div>
        <div className="text-sm text-gray-500">正在前往登录页面</div>
      </div>
    );
  }

  // 显示主页内容，即使认证上下文可能还在加载
  return (
    <>
      <Head>
        <title>AI Agent Flow Editor</title>
        <meta name="description" content="Visual editor for AI agent flows" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <NavBar />
      <main style={{ width: '100vw', height: 'calc(100vh - 64px)' }}>
        <ReactFlowWithNoSSR />
      </main>
    </>
  );
} 