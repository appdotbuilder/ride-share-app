import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ridesTable } from '../db/schema';
import { getRideStatus } from '../handlers/get_ride_status';
import { eq } from 'drizzle-orm';

describe('getRideStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return ride status by ID', async () => {
    // Create test user (rider)
    const riderResult = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();

    // Create test user (driver)
    const driverResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone_number: '+1987654321',
        role: 'driver'
      })
      .returning()
      .execute();

    const riderId = riderResult[0].id;
    const driverId = driverResult[0].id;

    // Create test ride with fare
    const rideResult = await db.insert(ridesTable)
      .values({
        rider_id: riderId,
        driver_id: driverId,
        pickup_address: '123 Main St, City',
        pickup_latitude: 40.7128,
        pickup_longitude: -74.0060,
        destination_address: '456 Oak Ave, City',
        destination_latitude: 40.7589,
        destination_longitude: -73.9851,
        status: 'in_progress',
        fare: '25.75', // Store as string (numeric column)
        distance: 5.2,
        duration: 15,
        accepted_at: new Date('2024-01-15T10:30:00Z'),
        started_at: new Date('2024-01-15T10:45:00Z')
      })
      .returning()
      .execute();

    const rideId = rideResult[0].id;

    // Test getting ride status
    const result = await getRideStatus(rideId);

    // Verify all fields are returned correctly
    expect(result.id).toEqual(rideId);
    expect(result.rider_id).toEqual(riderId);
    expect(result.driver_id).toEqual(driverId);
    expect(result.pickup_address).toEqual('123 Main St, City');
    expect(result.pickup_latitude).toEqual(40.7128);
    expect(result.pickup_longitude).toEqual(-74.0060);
    expect(result.destination_address).toEqual('456 Oak Ave, City');
    expect(result.destination_latitude).toEqual(40.7589);
    expect(result.destination_longitude).toEqual(-73.9851);
    expect(result.status).toEqual('in_progress');
    expect(result.fare).toEqual(25.75); // Should be converted to number
    expect(typeof result.fare).toEqual('number');
    expect(result.distance).toEqual(5.2);
    expect(result.duration).toEqual(15);
    expect(result.accepted_at).toBeInstanceOf(Date);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.requested_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle ride with null fare', async () => {
    // Create test user (rider)
    const riderResult = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Rider',
        role: 'rider'
      })
      .returning()
      .execute();

    const riderId = riderResult[0].id;

    // Create ride without fare (requested status)
    const rideResult = await db.insert(ridesTable)
      .values({
        rider_id: riderId,
        pickup_address: '789 Pine St',
        destination_address: '321 Elm St',
        status: 'requested',
        fare: null
      })
      .returning()
      .execute();

    const rideId = rideResult[0].id;

    const result = await getRideStatus(rideId);

    expect(result.id).toEqual(rideId);
    expect(result.status).toEqual('requested');
    expect(result.fare).toBeNull();
    expect(result.driver_id).toBeNull();
  });

  it('should handle different ride statuses correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'rider'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Test different statuses
    const statuses = ['requested', 'accepted', 'driver_en_route', 'completed', 'cancelled'] as const;
    
    for (const status of statuses) {
      const rideResult = await db.insert(ridesTable)
        .values({
          rider_id: userId,
          pickup_address: 'Test Pickup',
          destination_address: 'Test Destination',
          status: status
        })
        .returning()
        .execute();

      const result = await getRideStatus(rideResult[0].id);
      expect(result.status).toEqual(status);
    }
  });

  it('should throw error for non-existent ride', async () => {
    const nonExistentRideId = 99999;

    await expect(getRideStatus(nonExistentRideId))
      .rejects
      .toThrow(/Ride with ID 99999 not found/i);
  });

  it('should retrieve ride from database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'rider'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create ride with specific fare
    const rideResult = await db.insert(ridesTable)
      .values({
        rider_id: userId,
        pickup_address: 'Database Test Pickup',
        destination_address: 'Database Test Destination',
        status: 'completed',
        fare: '42.50' // Specific fare amount
      })
      .returning()
      .execute();

    const rideId = rideResult[0].id;

    // Get ride status
    const result = await getRideStatus(rideId);

    // Verify data was retrieved from database correctly
    const dbRide = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, rideId))
      .execute();

    expect(dbRide).toHaveLength(1);
    expect(result.pickup_address).toEqual(dbRide[0].pickup_address);
    expect(result.destination_address).toEqual(dbRide[0].destination_address);
    expect(result.status).toEqual(dbRide[0].status);
    expect(result.fare).toEqual(parseFloat(dbRide[0].fare!)); // Verify conversion
    expect(typeof result.fare).toEqual('number');
  });
});