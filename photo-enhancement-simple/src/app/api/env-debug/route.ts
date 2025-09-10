import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simple endpoint to debug environment variables
  const serviceAccounts = process.env.SERVICE_ACCOUNTS;
  const nodeEnv = process.env.NODE_ENV;
  
  return NextResponse.json({
    hasServiceAccounts: !!serviceAccounts,
    serviceAccountsLength: serviceAccounts?.length || 0,
    nodeEnv,
    firstChars: serviceAccounts?.substring(0, 50) || 'none',
    timestamp: new Date().toISOString()
  });
}