/**
 * Enhanced User Management System
 * Supports both OAuth and credentials authentication
 * Handles admin privileges and unlimited credits
 */

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/password-utils';
import type { User, UserRole } from '@prisma/client';

export interface CreateUserData {
  email: string;
  name?: string;
  password?: string;
  role?: UserRole;
  credits?: number;
}

export interface AuthenticateResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Create a new user with password authentication
 */
export async function createUserWithPassword(data: CreateUserData): Promise<AuthenticateResult> {
  try {
    // Validate email
    if (!data.email || !data.email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return { success: false, error: 'User already exists with this email' };
    }

    // Validate password if provided
    if (data.password) {
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }
    }

    // Determine credits based on role
    const credits = data.role === 'ADMIN' ? 999999 : (data.credits || 3);

    // Hash password if provided
    const hashedPassword = data.password ? await hashPassword(data.password) : null;

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role || 'USER',
        credits: credits,
        emailVerified: new Date() // Mark as verified for credentials users
      }
    });

    return { success: true, user };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateWithPassword(email: string, password: string): Promise<AuthenticateResult> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    return { success: true, user };
  } catch (error: any) {
    console.error('Error authenticating user:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Set up admin user with unlimited credits
 */
export async function setupAdminUser(email: string, name?: string, password?: string): Promise<AuthenticateResult> {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingAdmin) {
      // Update existing user to admin with unlimited credits
      const updatedUser = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          role: 'ADMIN',
          credits: 999999,
          name: name || existingAdmin.name,
          // Only update password if provided
          ...(password ? { password: await hashPassword(password) } : {})
        }
      });

      return { success: true, user: updatedUser };
    }

    // Create new admin user
    return await createUserWithPassword({
      email: email.toLowerCase(),
      name: name || 'Admin',
      password: password,
      role: 'ADMIN',
      credits: 999999
    });
  } catch (error: any) {
    console.error('Error setting up admin user:', error);
    return { success: false, error: 'Failed to setup admin user' };
  }
}

/**
 * Check if user is admin and has unlimited credits
 */
export function isAdminWithUnlimitedCredits(user: User): boolean {
  return user.role === 'ADMIN' && user.credits >= 999999;
}

/**
 * Deduct credits from user (skip for admins)
 */
export async function deductCredits(userId: string, amount: number = 1): Promise<{ success: boolean; newCredits?: number; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Skip credit deduction for admins
    if (isAdminWithUnlimitedCredits(user)) {
      return { success: true, newCredits: user.credits };
    }

    // Check if user has enough credits
    if (user.credits < amount) {
      return { success: false, error: 'Insufficient credits' };
    }

    // Deduct credits
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } }
    });

    return { success: true, newCredits: updatedUser.credits };
  } catch (error: any) {
    console.error('Error deducting credits:', error);
    return { success: false, error: 'Failed to deduct credits' };
  }
}

/**
 * Add credits to user (for purchases or admin grants)
 */
export async function addCredits(userId: string, amount: number): Promise<{ success: boolean; newCredits?: number; error?: string }> {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } }
    });

    return { success: true, newCredits: updatedUser.credits };
  } catch (error: any) {
    console.error('Error adding credits:', error);
    return { success: false, error: 'Failed to add credits' };
  }
}

/**
 * Get user with enhanced role information
 */
export async function getUserWithRole(userId: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId }
    });
  } catch (error: any) {
    console.error('Error getting user:', error);
    return null;
  }
}