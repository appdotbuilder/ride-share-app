import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { getDriverProfile } from '../handlers/get_driver_profile';
import { eq } from 'drizzle-orm';

describe('getDriverProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return driver profile for valid user', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create driver profile
    await db.insert(driverProfilesTable)
      .values({
        user_id: userId,
        license_number: 'DL123456',
        vehicle_make: 'Honda',
        vehicle_model: 'Civic',
        vehicle_year: 2021,
        vehicle_plate: 'XYZ789',
        status: 'available',
        rating: 4.5,
        total_rides: 25
      })
      .execute();

    const result = await getDriverProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.license_number).toEqual('DL123456');
    expect(result!.vehicle_make).toEqual('Honda');
    expect(result!.vehicle_model).toEqual('Civic');
    expect(result!.vehicle_year).toEqual(2021);
    expect(result!.vehicle_plate).toEqual('XYZ789');
    expect(result!.status).toEqual('available');
    expect(result!.rating).toEqual(4.5);
    expect(result!.total_rides).toEqual(25);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user', async () => {
    const result = await getDriverProfile(999);
    expect(result).toBeNull();
  });

  it('should return null for user without driver profile', async () => {
    // Create a user without driver profile
    const userResult = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getDriverProfile(userId);
    expect(result).toBeNull();
  });

  it('should handle driver profile with null rating', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'newdriver@test.com',
        password_hash: 'hashedpassword',
        full_name: 'New Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create driver profile without rating
    await db.insert(driverProfilesTable)
      .values({
        user_id: userId,
        license_number: 'DL987654',
        vehicle_make: 'Toyota',
        vehicle_model: 'Prius',
        vehicle_year: 2020,
        vehicle_plate: 'ABC123',
        status: 'unavailable',
        total_rides: 0
      })
      .execute();

    const result = await getDriverProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.rating).toBeNull();
    expect(result!.total_rides).toEqual(0);
    expect(result!.status).toEqual('unavailable');
  });

  it('should handle different driver statuses correctly', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'busydriver@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Busy Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create driver profile with 'busy' status
    await db.insert(driverProfilesTable)
      .values({
        user_id: userId,
        license_number: 'DL555555',
        vehicle_make: 'Ford',
        vehicle_model: 'Focus',
        vehicle_year: 2019,
        vehicle_plate: 'DEF456',
        status: 'busy',
        rating: 3.8,
        total_rides: 100
      })
      .execute();

    const result = await getDriverProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('busy');
    expect(result!.rating).toEqual(3.8);
    expect(result!.total_rides).toEqual(100);
  });

  it('should verify profile exists in database', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'verifydriver@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Verify Driver',
        phone_number: '+1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create driver profile
    const profileResult = await db.insert(driverProfilesTable)
      .values({
        user_id: userId,
        license_number: 'DL777777',
        vehicle_make: 'Nissan',
        vehicle_model: 'Altima',
        vehicle_year: 2022,
        vehicle_plate: 'GHI789',
        status: 'available',
        rating: 4.9,
        total_rides: 200
      })
      .returning()
      .execute();

    const result = await getDriverProfile(userId);

    // Verify the returned data matches what was inserted
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(profileResult[0].id);

    // Double-check by querying the database directly
    const dbProfile = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, userId))
      .execute();

    expect(dbProfile).toHaveLength(1);
    expect(result!.license_number).toEqual(dbProfile[0].license_number);
    expect(result!.vehicle_make).toEqual(dbProfile[0].vehicle_make);
  });
});