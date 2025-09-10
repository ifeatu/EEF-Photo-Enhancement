import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

const prisma = new PrismaClient();

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions) as Session | null;
    
    // For security, only allow this in development or if the current user is already an admin
    // OR if no admin users exist yet (bootstrap scenario)
    if (process.env.NODE_ENV === 'production') {
      // Check if any admin users exist
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });
      
      // If admin users exist, require authentication and admin role
      if (adminCount > 0) {
        if (!session?.user?.email) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Check if current user is admin
        const currentUser = await prisma.user.findUnique({
          where: { email: session.user.email }
        });
        
        if (currentUser?.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }
      }
      // If no admin users exist, allow the operation (bootstrap scenario)
    }
    
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    console.log(`Looking for user with email: ${email}`);
    
    // First, check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email
      }
    });
    
    if (!existingUser) {
      return NextResponse.json({ 
        error: `User with email ${email} not found. User must sign in at least once before being made admin.` 
      }, { status: 404 });
    }
    
    console.log(`Found user: ${existingUser.name} (${existingUser.email})`);
    console.log(`Current role: ${existingUser.role}`);
    
    if (existingUser.role === 'ADMIN') {
      return NextResponse.json({ 
        message: `User ${email} is already an admin`,
        user: {
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role
        }
      });
    }
    
    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: {
        email: email
      },
      data: {
        role: 'ADMIN'
      }
    });
    
    console.log(`✅ Successfully updated ${email} to ADMIN role`);
    
    return NextResponse.json({ 
      message: `Successfully updated ${email} to ADMIN role`,
      user: {
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    return NextResponse.json({ 
      error: 'Failed to update user role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}