import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ridesTable } from '../db/schema';
import { type UpdateRideStatusInput } from '../schema';
import { updateRideStatus } from '../handlers/update_ride_status';
import { eq } from 'drizzle-orm';

describe('updateRideStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let riderId: number;
  let driverId: number;
  let rideId: number;

  beforeEach(async () => {
    // Create test users
    const riderResult = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Rider',
        phone_number: '555-0101',
        role: 'rider'
      })
      .returning()
      .execute();
    riderId = riderResult[0].id;

    const driverResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Driver',
        phone_number: '555-0102',
        role: 'driver'
      })
      .returning()
      .execute();
    driverId = driverResult[0].id;

    // Create test ride
    const rideResult = await db.insert(ridesTable)
      .values({
        rider_id: riderId,
        driver_id: driverId,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'requested'
      })
      .returning()
      .execute();
    rideId = rideResult[0].id;
  });

  it('should update ride status successfully', async () => {
    const input: UpdateRideStatusInput = {
      ride_id: rideId,
      status: 'accepted'
    };

    const result = await updateRideStatus(input);

    expect(result.id).toBe(rideId);
    expect(result.status).toBe('accepted');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set accepted_at timestamp when transitioning to driver_en_route', async () => {
    // First update to accepted
    await updateRideStatus({
      ride_id: rideId,
      status: 'accepted'
    });

    // Then to driver_en_route
    const result = await updateRideStatus({
      ride_id: rideId,
      status: 'driver_en_route'
    });

    expect(result.status).toBe('driver_en_route');
    expect(result.accepted_at).toBeInstanceOf(Date);
  });

  it('should set started_at timestamp when transitioning to in_progress', async () => {
    // Progress through valid states
    await updateRideStatus({ ride_id: rideId, status: 'accepted' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_en_route' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_arrived' });

    const result = await updateRideStatus({
      ride_id: rideId,
      status: 'in_progress'
    });

    expect(result.status).toBe('in_progress');
    expect(result.started_at).toBeInstanceOf(Date);
  });

  it('should set completed_at timestamp and fare when transitioning to completed', async () => {
    // Progress through valid states
    await updateRideStatus({ ride_id: rideId, status: 'accepted' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_en_route' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_arrived' });
    await updateRideStatus({ ride_id: rideId, status: 'in_progress' });

    const result = await updateRideStatus({
      ride_id: rideId,
      status: 'completed',
      fare: 25.50
    });

    expect(result.status).toBe('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.fare).toBe(25.50);
    expect(typeof result.fare).toBe('number');
  });

  it('should save updates to database', async () => {
    await updateRideStatus({
      ride_id: rideId,
      status: 'accepted'
    });

    // Verify in database
    const rides = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, rideId))
      .execute();

    expect(rides).toHaveLength(1);
    expect(rides[0].status).toBe('accepted');
    expect(rides[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for invalid ride ID', async () => {
    const input: UpdateRideStatusInput = {
      ride_id: 99999,
      status: 'accepted'
    };

    await expect(updateRideStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error for invalid status transition', async () => {
    const input: UpdateRideStatusInput = {
      ride_id: rideId,
      status: 'completed' // Invalid from 'requested'
    };

    await expect(updateRideStatus(input)).rejects.toThrow(/invalid status transition/i);
  });

  it('should throw error when setting fare for non-completed ride', async () => {
    const input: UpdateRideStatusInput = {
      ride_id: rideId,
      status: 'accepted',
      fare: 25.00
    };

    await expect(updateRideStatus(input)).rejects.toThrow(/fare can only be set when ride status is completed/i);
  });

  it('should allow cancellation from any non-terminal state', async () => {
    // Test cancellation from requested
    const result1 = await updateRideStatus({
      ride_id: rideId,
      status: 'cancelled'
    });
    expect(result1.status).toBe('cancelled');

    // Create another ride to test cancellation from accepted
    const rideResult2 = await db.insert(ridesTable)
      .values({
        rider_id: riderId,
        driver_id: driverId,
        pickup_address: '789 Pine St',
        destination_address: '321 Elm Ave',
        status: 'accepted'
      })
      .returning()
      .execute();

    const result2 = await updateRideStatus({
      ride_id: rideResult2[0].id,
      status: 'cancelled'
    });
    expect(result2.status).toBe('cancelled');
  });

  it('should not allow transitions from terminal states', async () => {
    // Complete a ride
    await updateRideStatus({ ride_id: rideId, status: 'accepted' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_en_route' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_arrived' });
    await updateRideStatus({ ride_id: rideId, status: 'in_progress' });
    await updateRideStatus({ ride_id: rideId, status: 'completed', fare: 20.00 });

    // Try to change from completed state
    await expect(updateRideStatus({
      ride_id: rideId,
      status: 'cancelled'
    })).rejects.toThrow(/invalid status transition/i);
  });

  it('should handle numeric conversion correctly', async () => {
    // Progress to completed with fare
    await updateRideStatus({ ride_id: rideId, status: 'accepted' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_en_route' });
    await updateRideStatus({ ride_id: rideId, status: 'driver_arrived' });
    await updateRideStatus({ ride_id: rideId, status: 'in_progress' });

    const result = await updateRideStatus({
      ride_id: rideId,
      status: 'completed',
      fare: 15.75
    });

    // Verify numeric conversion
    expect(typeof result.fare).toBe('number');
    expect(result.fare).toBe(15.75);

    // Verify database storage
    const dbRides = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, rideId))
      .execute();

    expect(typeof dbRides[0].fare).toBe('string'); // Stored as string
    expect(parseFloat(dbRides[0].fare!)).toBe(15.75);
  });
});