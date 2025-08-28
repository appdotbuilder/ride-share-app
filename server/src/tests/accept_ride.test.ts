import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ridesTable, usersTable, driverProfilesTable } from '../db/schema';
import { type AcceptRideInput } from '../schema';
import { acceptRide } from '../handlers/accept_ride';
import { eq } from 'drizzle-orm';

describe('acceptRide', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testRiderId: number;
  let testDriverId: number;
  let testRideId: number;

  beforeEach(async () => {
    // Create a test rider
    const riderResult = await db.insert(usersTable)
      .values({
        email: 'rider@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'John Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();
    testRiderId = riderResult[0].id;

    // Create a test driver
    const driverResult = await db.insert(usersTable)
      .values({
        email: 'driver@example.com',
        password_hash: 'hashedpassword456',
        full_name: 'Jane Driver',
        phone_number: '+1987654321',
        role: 'driver'
      })
      .returning()
      .execute();
    testDriverId = driverResult[0].id;

    // Create driver profile (available)
    await db.insert(driverProfilesTable)
      .values({
        user_id: testDriverId,
        license_number: 'DL123456789',
        vehicle_make: 'Toyota',
        vehicle_model: 'Camry',
        vehicle_year: 2022,
        vehicle_plate: 'ABC123',
        status: 'available'
      })
      .execute();

    // Create a requested ride
    const rideResult = await db.insert(ridesTable)
      .values({
        rider_id: testRiderId,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'requested'
      })
      .returning()
      .execute();
    testRideId = rideResult[0].id;
  });

  const testInput: AcceptRideInput = {
    ride_id: 0, // Will be set in each test
    driver_id: 0 // Will be set in each test
  };

  it('should accept a ride successfully', async () => {
    const input = {
      ...testInput,
      ride_id: testRideId,
      driver_id: testDriverId
    };

    const result = await acceptRide(input);

    // Verify the returned ride data
    expect(result.id).toEqual(testRideId);
    expect(result.driver_id).toEqual(testDriverId);
    expect(result.status).toEqual('accepted');
    expect(result.accepted_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.rider_id).toEqual(testRiderId);
  });

  it('should update ride in database correctly', async () => {
    const input = {
      ...testInput,
      ride_id: testRideId,
      driver_id: testDriverId
    };

    await acceptRide(input);

    // Verify database was updated
    const rides = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, testRideId))
      .execute();

    expect(rides).toHaveLength(1);
    const ride = rides[0];
    expect(ride.driver_id).toEqual(testDriverId);
    expect(ride.status).toEqual('accepted');
    expect(ride.accepted_at).toBeInstanceOf(Date);
    expect(ride.updated_at).toBeInstanceOf(Date);
  });

  it('should update driver status to busy', async () => {
    const input = {
      ...testInput,
      ride_id: testRideId,
      driver_id: testDriverId
    };

    await acceptRide(input);

    // Verify driver profile status was updated
    const driverProfiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, testDriverId))
      .execute();

    expect(driverProfiles).toHaveLength(1);
    expect(driverProfiles[0].status).toEqual('busy');
    expect(driverProfiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when ride does not exist', async () => {
    const input = {
      ...testInput,
      ride_id: 99999, // Non-existent ride ID
      driver_id: testDriverId
    };

    expect(acceptRide(input)).rejects.toThrow(/ride not found or not available/i);
  });

  it('should throw error when ride is not in requested status', async () => {
    // Update ride to accepted status
    await db.update(ridesTable)
      .set({ status: 'accepted' })
      .where(eq(ridesTable.id, testRideId))
      .execute();

    const input = {
      ...testInput,
      ride_id: testRideId,
      driver_id: testDriverId
    };

    expect(acceptRide(input)).rejects.toThrow(/ride not found or not available/i);
  });

  it('should throw error when driver does not exist', async () => {
    const input = {
      ...testInput,
      ride_id: testRideId,
      driver_id: 99999 // Non-existent driver ID
    };

    expect(acceptRide(input)).rejects.toThrow(/driver not found or not available/i);
  });

  it('should throw error when driver is not available', async () => {
    // Update driver status to busy
    await db.update(driverProfilesTable)
      .set({ status: 'busy' })
      .where(eq(driverProfilesTable.user_id, testDriverId))
      .execute();

    const input = {
      ...testInput,
      ride_id: testRideId,
      driver_id: testDriverId
    };

    expect(acceptRide(input)).rejects.toThrow(/driver not found or not available/i);
  });

  it('should throw error when user is not a driver', async () => {
    // Create a regular user (rider) without driver profile
    const nonDriverResult = await db.insert(usersTable)
      .values({
        email: 'notadriver@example.com',
        password_hash: 'hashedpassword789',
        full_name: 'Not A Driver',
        phone_number: '+1111111111',
        role: 'rider'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      ride_id: testRideId,
      driver_id: nonDriverResult[0].id
    };

    expect(acceptRide(input)).rejects.toThrow(/driver not found or not available/i);
  });

  it('should handle rides with fare correctly', async () => {
    // Create a ride with fare
    const rideWithFareResult = await db.insert(ridesTable)
      .values({
        rider_id: testRiderId,
        pickup_address: '789 Pine St',
        destination_address: '321 Elm Ave',
        status: 'requested',
        fare: '25.50' // Stored as string in database (numeric column)
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      ride_id: rideWithFareResult[0].id,
      driver_id: testDriverId
    };

    const result = await acceptRide(input);

    // Verify numeric conversion
    expect(result.fare).toEqual(25.50);
    expect(typeof result.fare).toBe('number');
  });
});