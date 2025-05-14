import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { name: string; version: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filePath = path.join(
      process.cwd(),
      'agent-data',
      'workspace',
      user.username,
      params.name,
      `${params.version}.json`
    );

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading workspace:', error);
    return NextResponse.json({ error: 'Failed to load workspace' }, { status: 500 });
  }
} 