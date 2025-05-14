import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceDir = path.join(process.cwd(), 'agent-data', 'workspace', user.username, params.name);
    
    try {
      const files = await fs.readdir(workspaceDir);
      const versions = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(workspaceDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          return {
            version: path.parse(file).name,
            timestamp: data.timestamp,
            nodes: data.nodes,
            edges: data.edges
          };
        })
      );

      // Sort versions by timestamp in descending order
      versions.sort((a, b) => b.timestamp - a.timestamp);
      
      return NextResponse.json(versions);
    } catch (error) {
      // If directory doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json([]);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting workspace versions:', error);
    return NextResponse.json({ error: 'Failed to get workspace versions' }, { status: 500 });
  }
} 