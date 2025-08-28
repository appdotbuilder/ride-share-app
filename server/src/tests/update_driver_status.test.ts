import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type UpdateDriverStatusInput } from '../schema';
import { updateDriverStatus } from '../handlers/update_driver_status';
import { eq } from 'drizzle-orm';

describe('updateDriverStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testDriverId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create a test driver profile
    const driverResult = await db.insert(driverProfilesTable)
      .values({
        user_id: testUserId,
        license_number: 'TEST123456',
        vehicle_make: 'Toyota',
        vehicle_model: 'Camry',
        vehicle_year: 2020,
        vehicle_plate: 'ABC123',
        status: 'unavailable'
      })
      .returning()
      .execute();
    
    testDriverId = driverResult[0].id;
  });

  const createTestInput = (status: 'available' | 'unavailable' | 'busy' = 'available'): UpdateDriverStatusInput => ({
    driver_id: testDriverId,
    status
  });

  it('should update driver status to available', async () => {
    const input = createTestInput('available');
    
    const result = await updateDriverStatus(input);

    expect(result.id).toEqual(testDriverId);
    expect(result.status).toEqual('available');
    expect(result.user_id).toEqual(testUserId);
    expect(result.license_number).toEqual('TEST123456');
    expect(result.vehicle_make).toEqual('Toyota');
    expect(result.vehicle_model).toEqual('Camry');
    expect(result.vehicle_year).toEqual(2020);
    expect(result.vehicle_plate).toEqual('ABC123');
    expect(result.total_rides).toEqual(0);
    expect(result.rating).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update driver status to busy', async () => {
    const input = createTestInput('busy');
    
    const result = await updateDriverStatus(input);

    expect(result.status).toEqual('busy');
    expect(result.id).toEqual(testDriverId);
  });

  it('should update driver status to unavailable', async () => {
    const input = createTestInput('unavailable');
    
    const result = await updateDriverStatus(input);

    expect(result.status).toEqual('unavailable');
    expect(result.id).toEqual(testDriverId);
  });

  it('should persist status change in database', async () => {
    const input = createTestInput('available');
    
    await updateDriverStatus(input);

    // Query database directly to verify persistence
    const drivers = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.id, testDriverId))
      .execute();

    expect(drivers).toHaveLength(1);
    expect(drivers[0].status).toEqual('available');
    expect(drivers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original updated_at timestamp
    const originalDriver = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.id, testDriverId))
      .execute();
    
    const originalUpdatedAt = originalDriver[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input = createTestInput('available');
    const result = await updateDriverStatus(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when driver profile does not exist', async () => {
    const input: UpdateDriverStatusInput = {
      driver_id: 99999, // Non-existent driver ID
      status: 'available'
    };

    await expect(updateDriverStatus(input)).rejects.toThrow(/Driver profile with id 99999 not found/i);
  });

  it('should handle driver profile with rating', async () => {
    // Update driver to have a rating
    await db.update(driverProfilesTable)
      .set({ rating: 4.5 })
      .where(eq(driverProfilesTable.id, testDriverId))
      .execute();

    const input = createTestInput('available');
    const result = await updateDriverStatus(input);

    expect(result.rating).toEqual(4.5);
    expect(typeof result.rating).toBe('number');
  });

  it('should maintain other driver profile fields unchanged', async () => {
    // Update some fields first
    await db.update(driverProfilesTable)
      .set({ 
        rating: 4.8,
        total_rides: 25 
      })
      .where(eq(driverProfilesTable.id, testDriverId))
      .execute();

    const input = createTestInput('busy');
    const result = await updateDriverStatus(input);

    // Verify only status and updated_at changed
    expect(result.status).toEqual('busy');
    expect(result.rating).toEqual(4.8);
    expect(result.total_rides).toEqual(25);
    expect(result.license_number).toEqual('TEST123456');
    expect(result.vehicle_make).toEqual('Toyota');
    expect(result.vehicle_model).toEqual('Camry');
    expect(result.vehicle_year).toEqual(2020);
    expect(result.vehicle_plate).toEqual('ABC123');
  });
});