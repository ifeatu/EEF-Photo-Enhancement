import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simple endpoint to debug environment variables
  const serviceAccounts = process.env.SERVICE_ACCOUNTS;
  const serviceTokens = process.env.SERVICE_TOKENS;
  const serviceApiKeys = process.env.SERVICE_API_KEYS;
  const serviceAuthSalt = process.env.SERVICE_AUTH_SALT;
  const nodeEnv = process.env.NODE_ENV;
  
  return NextResponse.json({
    hasServiceAccounts: !!serviceAccounts,
    serviceAccountsLength: serviceAccounts?.length || 0,
    hasServiceTokens: !!serviceTokens,
    serviceTokensLength: serviceTokens?.length || 0,
    hasServiceApiKeys: !!serviceApiKeys,
    serviceApiKeysLength: serviceApiKeys?.length || 0,
    hasServiceAuthSalt: !!serviceAuthSalt,
    serviceAuthSaltLength: serviceAuthSalt?.length || 0,
    nodeEnv,
    firstChars: serviceAccounts?.substring(0, 50) || 'none',
    serviceTokensFirstChars: serviceTokens?.substring(0, 50) || 'none',
    timestamp: new Date().toISOString()
  });
}