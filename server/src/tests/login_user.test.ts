import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'test_password_123',
  full_name: 'Test User',
  phone_number: '555-0123',
  role: 'rider' as const
};

const loginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'test_password_123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test user in database
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(loginInput);

    // Verify returned user data
    expect(result.email).toEqual('test@example.com');
    expect(result.password_hash).toEqual('test_password_123');
    expect(result.full_name).toEqual('Test User');
    expect(result.phone_number).toEqual('555-0123');
    expect(result.role).toEqual('rider');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should login driver user successfully', async () => {
    // Create test driver user
    const driverUser = {
      ...testUser,
      email: 'driver@example.com',
      role: 'driver' as const
    };

    await db.insert(usersTable)
      .values(driverUser)
      .execute();

    const result = await loginUser({
      email: 'driver@example.com',
      password: 'test_password_123'
    });

    expect(result.email).toEqual('driver@example.com');
    expect(result.role).toEqual('driver');
    expect(result.full_name).toEqual('Test User');
  });

  it('should handle user with null phone number', async () => {
    // Create user with null phone
    const userWithoutPhone = {
      ...testUser,
      phone_number: null
    };

    await db.insert(usersTable)
      .values(userWithoutPhone)
      .execute();

    const result = await loginUser(loginInput);

    expect(result.phone_number).toBeNull();
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
  });

  it('should throw error for non-existent user', async () => {
    // Don't create any users in database

    await expect(loginUser({
      email: 'nonexistent@example.com',
      password: 'any_password'
    })).rejects.toThrow(/user not found/i);
  });

  it('should throw error for invalid password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Try to login with wrong password
    await expect(loginUser({
      email: 'test@example.com',
      password: 'wrong_password'
    })).rejects.toThrow(/invalid password/i);
  });

  it('should throw error for empty password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Try to login with empty password
    await expect(loginUser({
      email: 'test@example.com',
      password: ''
    })).rejects.toThrow(/invalid password/i);
  });

  it('should be case-sensitive for email', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Try to login with uppercase email
    await expect(loginUser({
      email: 'TEST@EXAMPLE.COM',
      password: 'test_password_123'
    })).rejects.toThrow(/user not found/i);
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const users = [
      testUser,
      {
        email: 'user2@example.com',
        password_hash: 'password2',
        full_name: 'User Two',
        phone_number: '555-0456',
        role: 'driver' as const
      },
      {
        email: 'user3@example.com',
        password_hash: 'password3',
        full_name: 'User Three',
        phone_number: null,
        role: 'rider' as const
      }
    ];

    for (const user of users) {
      await db.insert(usersTable)
        .values(user)
        .execute();
    }

    // Login as second user
    const result = await loginUser({
      email: 'user2@example.com',
      password: 'password2'
    });

    expect(result.email).toEqual('user2@example.com');
    expect(result.full_name).toEqual('User Two');
    expect(result.role).toEqual('driver');
    expect(result.phone_number).toEqual('555-0456');
  });
});