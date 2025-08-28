import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type CreateDriverProfileInput } from '../schema';
import { createDriverProfile } from '../handlers/create_driver_profile';
import { eq } from 'drizzle-orm';

// Test input
const testDriverInput: CreateDriverProfileInput = {
  user_id: 1,
  license_number: 'DL12345678',
  vehicle_make: 'Toyota',
  vehicle_model: 'Camry',
  vehicle_year: 2020,
  vehicle_plate: 'ABC123'
};

describe('createDriverProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a driver profile for valid driver user', async () => {
    // Create prerequisite driver user
    await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .execute();

    const result = await createDriverProfile(testDriverInput);

    // Verify returned profile
    expect(result.user_id).toEqual(1);
    expect(result.license_number).toEqual('DL12345678');
    expect(result.vehicle_make).toEqual('Toyota');
    expect(result.vehicle_model).toEqual('Camry');
    expect(result.vehicle_year).toEqual(2020);
    expect(result.vehicle_plate).toEqual('ABC123');
    expect(result.status).toEqual('unavailable');
    expect(result.rating).toBeNull();
    expect(result.total_rides).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save driver profile to database', async () => {
    // Create prerequisite driver user
    await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .execute();

    const result = await createDriverProfile(testDriverInput);

    // Query database to verify profile was saved
    const profiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user_id).toEqual(1);
    expect(profiles[0].license_number).toEqual('DL12345678');
    expect(profiles[0].vehicle_make).toEqual('Toyota');
    expect(profiles[0].vehicle_model).toEqual('Camry');
    expect(profiles[0].vehicle_year).toEqual(2020);
    expect(profiles[0].vehicle_plate).toEqual('ABC123');
    expect(profiles[0].status).toEqual('unavailable');
    expect(profiles[0].rating).toBeNull();
    expect(profiles[0].total_rides).toEqual(0);
  });

  it('should throw error if user does not exist', async () => {
    await expect(createDriverProfile(testDriverInput))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error if user is not a driver', async () => {
    // Create rider user instead of driver
    await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .execute();

    await expect(createDriverProfile(testDriverInput))
      .rejects.toThrow(/user must have driver role/i);
  });

  it('should throw error if driver profile already exists', async () => {
    // Create driver user
    await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .execute();

    // Create first driver profile
    await createDriverProfile(testDriverInput);

    // Try to create another profile for same user
    const duplicateInput: CreateDriverProfileInput = {
      ...testDriverInput,
      license_number: 'DL87654321',
      vehicle_plate: 'XYZ789'
    };

    await expect(createDriverProfile(duplicateInput))
      .rejects.toThrow(/driver profile already exists/i);
  });

  it('should create profile with correct default values', async () => {
    // Create prerequisite driver user
    await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .execute();

    const result = await createDriverProfile(testDriverInput);

    // Verify default values are set correctly
    expect(result.status).toEqual('unavailable');
    expect(result.rating).toBeNull();
    expect(result.total_rides).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000);
    expect(result.created_at.getTime()).toBeGreaterThan(minuteAgo.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(minuteAgo.getTime());
  });
});