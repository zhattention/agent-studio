// Authentication configuration
// Load these values from environment variables in production
import { Secret } from 'jsonwebtoken';

export const AUTH_CONFIG = {
  // JWT Secret - should be a long, random string in production
  JWT_SECRET: (process.env.JWT_SECRET || 'your_jwt_secret_key') as Secret,
  
  // Token settings
  TOKEN_EXPIRY: '1d' as const, // 1 day
  TOKEN_MAX_AGE: 60 * 60 * 24, // 1 day in seconds
  
  // Cookie settings
  COOKIE_NAME: 'auth_token',
  COOKIE_HTTP_ONLY: true,
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  COOKIE_SAME_SITE: 'lax' as const,
};

// Production users should be stored in a secure database
// These environment variables MUST be set for the application to work
export const USERS = [
  { 
    username: process.env.ADMIN_USERNAME, 
    password: process.env.ADMIN_PASSWORD 
  },
  { 
    username: process.env.USER_USERNAME, 
    password: process.env.USER_PASSWORD 
  }
].filter(user => user.username && user.password); // Only include users with valid credentials 