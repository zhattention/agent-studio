import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceDir = path.join(process.cwd(), 'agent-data', 'workspace', user.username);
    
    try {
      const workspaces = await fs.readdir(workspaceDir);
      return NextResponse.json(workspaces);
    } catch (error) {
      // If directory doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json([]);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error listing workspaces:', error);
    return NextResponse.json({ error: 'Failed to list workspaces' }, { status: 500 });
  }
} 