import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Handle CORS preflight requests
export async function OPTIONS() {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function GET() {
  try {
    console.log('Starting database connection test...');
    
    // Log environment variables (safely)
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? 'Set' : 'Missing',
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? 'Set' : 'Missing',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
    });
    
    // Test connection
    await prisma.$connect();
    console.log('Database connection successful');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`Query successful - User count: ${userCount}`);
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      userCount,
      message: 'Database connection successful'
    });
    
  } catch (error: any) {
    console.error('Database connection failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}