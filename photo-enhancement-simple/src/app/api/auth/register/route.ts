/**
 * User Registration API Route
 * 
 * Handles user registration with email and password
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUserWithPassword } from '@/lib/user-management';
import { 
  createCorsResponse, 
  createCorsErrorResponse, 
  handleOptionsRequest 
} from '@/lib/cors';

export async function OPTIONS() {
  return handleOptionsRequest();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return createCorsErrorResponse('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    if (!email.includes('@')) {
      return createCorsErrorResponse('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Create user
    const result = await createUserWithPassword({
      email: email.toLowerCase().trim(),
      password,
      name: name?.trim(),
      role: 'USER',
      credits: 3
    });

    if (!result.success) {
      return createCorsErrorResponse(result.error || 'Registration failed', 400, 'REGISTRATION_FAILED');
    }

    // Return success (don't include sensitive data)
    return createCorsResponse({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
        credits: result.user!.credits
      }
    }, 201);

  } catch (error: any) {
    console.error('Registration error:', error);
    return createCorsErrorResponse(
      process.env.NODE_ENV === 'development' ? error.message : 'Registration failed',
      500,
      'SERVER_ERROR'
    );
  }
}