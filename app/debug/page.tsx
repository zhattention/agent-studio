'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { USERS } from '../../config/auth.config';

export default function DebugPage() {
  const [status, setStatus] = useState<string>('正在检查...');
  const [userConfig, setUserConfig] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  // 检查身份验证状态
  useEffect(() => {
    async function checkAuth() {
      try {
        setStatus('正在检查用户配置...');
        // 检查用户配置
        const configResponse = await fetch('/api/auth/check');
        const configData = await configResponse.json();
        setUserConfig(configData);
        
        setStatus('正在测试配置文件API...');
        // 尝试访问API
        const apiResponse = await fetch('/api/user/profile');
        const apiData = await apiResponse.json();
        
        if (apiResponse.ok) {
          setStatus('已认证');
          setApiResponse(JSON.stringify(apiData, null, 2));
        } else {
          setStatus('未认证');
          setApiResponse(JSON.stringify(apiData, null, 2));
        }
      } catch (error) {
        setStatus('检查出错');
        console.error('调试页面错误:', error);
        setApiResponse(String(error));
      }
    }
    
    checkAuth();
  }, []);
  
  // 直接登录
  const handleDirectLogin = async () => {
    try {
      setIsLoggingIn(true);
      
      // 获取环境变量中的用户名和密码
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'tristan',  // 使用您在.env中设置的用户名
          password: 'AWS@Tristan',  // 使用您在.env中设置的密码
        }),
      });
      
      const loginResult = await loginResponse.json();
      
      if (loginResponse.ok) {
        setStatus('登录成功！正在重定向...');
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setStatus(`登录失败: ${loginResult.error || '未知错误'}`);
      }
    } catch (error) {
      setStatus(`登录错误: ${error}`);
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // 检查中间件状态
  const checkMiddleware = async () => {
    try {
      setStatus('正在检查中间件...');
      const response = await fetch('/api/debug/middleware-test');
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
      setStatus('中间件检查完成');
    } catch (error) {
      setStatus(`中间件检查错误: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">认证调试页面</h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h2 className="text-lg font-semibold mb-2">当前状态</h2>
          <div className="text-xl">{status}</div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">用户配置</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40">
            {userConfig ? JSON.stringify(userConfig, null, 2) : '加载中...'}
          </pre>
          
          <p className="mt-2">
            配置的用户数量: {USERS?.length || '无法确定'}
          </p>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">API 响应</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40">
            {apiResponse || '无数据'}
          </pre>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={handleDirectLogin}
            disabled={isLoggingIn}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {isLoggingIn ? '登录中...' : '直接登录'}
          </button>
          
          <button
            onClick={checkMiddleware}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            检查中间件
          </button>
          
          <button
            onClick={() => router.push('/login')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            前往登录页
          </button>
        </div>
      </div>
    </div>
  );
} 