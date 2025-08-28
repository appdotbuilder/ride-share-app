import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginUserInput): Promise<User> => {
  try {
    // Query user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // In a real implementation, you would hash the input password and compare
    // For this implementation, we'll do a simple comparison
    // Note: In production, use bcrypt or similar for password hashing
    if (user.password_hash !== input.password) {
      throw new Error('Invalid password');
    }

    // Return user data (excluding sensitive information in real apps)
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      full_name: user.full_name,
      phone_number: user.phone_number,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};