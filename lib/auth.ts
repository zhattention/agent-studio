import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export interface User {
  username: string;
  email?: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Try to get token from Authorization header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    // Try to get token from auth_token cookie
    const cookieStore = cookies();
    const authCookie = cookieStore.get('auth_token')?.value;
    
    console.log('Authorization header:', authHeader);
    console.log('Auth cookie:', authCookie);
    
    // Check header first
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // If no valid header, try cookie
    else if (authCookie) {
      token = authCookie;
    }
    
    if (!token) {
      console.log('No token found in request');
      return null;
    }

    console.log('Using token:', token);
    
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as User;
    
    if (!decoded || !decoded.username) {
      console.log('Token verification failed or invalid payload');
      return null;
    }

    console.log('Authenticated user:', decoded.username);
    return {
      username: decoded.username,
      email: decoded.email
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Helper function to generate a JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { username: user.username, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
}

// Helper function to verify a JWT token
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as User;
    return decoded;
  } catch (error) {
    return null;
  }
} 