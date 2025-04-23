'use client';

import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamic import ReactFlow to avoid SSR issues
const ReactFlowWithNoSSR = dynamic(
  () => import('@/components/AgentFlow'),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <Head>
        <title>AI Agent Flow Editor</title>
        <meta name="description" content="Visual editor for AI agent flows" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ width: '100vw', height: '100vh' }}>
        <ReactFlowWithNoSSR />
      </main>
    </>
  );
} 