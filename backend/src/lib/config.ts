import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  frontendUrl: string;
  googleClientId?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function validateConfig(): ServerConfig {
  const missingVars: string[] = [];

  if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.trim()) {
    missingVars.push('MONGODB_URI');
  }

  if (missingVars.length > 0) {
    const errorMsg = `[CONFIG] Missing required environment variable: ${missingVars.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const port = Number(process.env.PORT) || 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const mongodbUri = process.env.MONGODB_URI!.trim();
  const jwtAccessSecret =
    process.env.JWT_ACCESS_SECRET ||
    'civics_plus_default_jwt_access_secret_tamil_nadu_2026_secure';
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    'civics_plus_default_jwt_refresh_secret_tamil_nadu_2026_secure';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    port,
    nodeEnv,
    mongodbUri,
    jwtAccessSecret,
    jwtRefreshSecret,
    frontendUrl,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  };
}
