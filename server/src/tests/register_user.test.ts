import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Complete test input
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  full_name: 'John Doe',
  phone_number: '+1234567890',
  role: 'rider'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('John Doe');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.role).toEqual('rider');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash.length).toBeGreaterThan(0);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('John Doe');
    expect(users[0].phone_number).toEqual('+1234567890');
    expect(users[0].role).toEqual('rider');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
    expect(users[0].password_hash).not.toEqual(testInput.password);
  });

  it('should hash password correctly', async () => {
    const result = await registerUser(testInput);

    // Verify password was hashed using Bun's password verification
    const isValidPassword = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify wrong password fails
    const isInvalidPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should create driver user successfully', async () => {
    const driverInput: RegisterUserInput = {
      ...testInput,
      email: 'driver@example.com',
      role: 'driver'
    };

    const result = await registerUser(driverInput);

    expect(result.email).toEqual('driver@example.com');
    expect(result.role).toEqual('driver');
    expect(result.id).toBeDefined();
  });

  it('should handle null phone number', async () => {
    const inputWithNullPhone: RegisterUserInput = {
      ...testInput,
      email: 'nullphone@example.com',
      phone_number: null
    };

    const result = await registerUser(inputWithNullPhone);

    expect(result.email).toEqual('nullphone@example.com');
    expect(result.phone_number).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await registerUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: RegisterUserInput = {
      ...testInput,
      full_name: 'Jane Doe'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different users with different emails', async () => {
    // Create first user
    const user1 = await registerUser(testInput);

    // Create second user with different email
    const secondInput: RegisterUserInput = {
      ...testInput,
      email: 'different@example.com',
      full_name: 'Jane Doe'
    };

    const user2 = await registerUser(secondInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('different@example.com');

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should generate unique hashes for same password', async () => {
    const user1 = await registerUser(testInput);

    const secondInput: RegisterUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    const user2 = await registerUser(secondInput);

    // Same password should generate different hashes due to salt
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // But both should verify correctly
    const verify1 = await Bun.password.verify(testInput.password, user1.password_hash);
    const verify2 = await Bun.password.verify(testInput.password, user2.password_hash);
    
    expect(verify1).toBe(true);
    expect(verify2).toBe(true);
  });
});