import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    console.log('Handling workspace save request with name param:', params.name);
    
    const user = await getCurrentUser();
    console.log('Auth result:', user ? `User: ${user.username}` : 'No authenticated user');
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    console.log('Request body received:', {
      dataExists: !!data,
      nodeCount: data?.nodes?.length
    });
    
    if (!data) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Create workspace directory if it doesn't exist
    const workspaceDir = path.join(process.cwd(), 'agent-data', 'workspace', user.username, params.name);
    await fs.mkdir(workspaceDir, { recursive: true });
    console.log('Created workspace directory:', workspaceDir);

    // Generate version number
    const files = await fs.readdir(workspaceDir);
    const version = (files.length + 1).toString().padStart(3, '0');
    console.log('Generated version:', version);

    // Save workspace file
    const filePath = path.join(workspaceDir, `${version}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log('Workspace saved to:', filePath);

    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Error saving workspace:', error);
    return NextResponse.json({ error: 'Failed to save workspace' }, { status: 500 });
  }
} 