import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ridesTable } from '../db/schema';
import { type GetUserRidesInput } from '../schema';
import { getUserRides } from '../handlers/get_user_rides';
import { eq } from 'drizzle-orm';

describe('getUserRides', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch rides where user is a rider', async () => {
    // Create test users
    const [rider, driver] = await db.insert(usersTable)
      .values([
        {
          email: 'rider@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Rider',
          phone_number: '+1234567890',
          role: 'rider'
        },
        {
          email: 'driver@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Driver',
          phone_number: '+0987654321',
          role: 'driver'
        }
      ])
      .returning()
      .execute();

    // Create test rides with explicit timestamps to ensure ordering
    const now = new Date();
    const earlier = new Date(now.getTime() - 60 * 1000); // 1 minute earlier

    const [ride1] = await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        driver_id: driver.id,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'completed',
        fare: '25.75',
        requested_at: earlier
      })
      .returning()
      .execute();

    const [ride2] = await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        driver_id: driver.id,
        pickup_address: '789 Pine St',
        destination_address: '321 Elm St',
        status: 'in_progress',
        fare: '18.50',
        requested_at: now
      })
      .returning()
      .execute();

    const input: GetUserRidesInput = {
      user_id: rider.id,
      limit: 10,
      offset: 0
    };

    const result = await getUserRides(input);

    expect(result).toHaveLength(2);
    
    // Verify rides are ordered by most recent first (requested_at desc)
    expect(result[0].id).toBe(ride2.id);
    expect(result[1].id).toBe(ride1.id);
    
    // Verify numeric conversion for fare
    expect(result[0].fare).toBe(18.50);
    expect(typeof result[0].fare).toBe('number');
    expect(result[1].fare).toBe(25.75);
    expect(typeof result[1].fare).toBe('number');

    // Verify ride details
    expect(result[0].rider_id).toBe(rider.id);
    expect(result[0].driver_id).toBe(driver.id);
    expect(result[0].status).toBe('in_progress');
    expect(result[0].pickup_address).toBe('789 Pine St');
    expect(result[0].destination_address).toBe('321 Elm St');
  });

  it('should fetch rides where user is a driver', async () => {
    // Create test users
    const [rider, driver] = await db.insert(usersTable)
      .values([
        {
          email: 'rider@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Rider',
          phone_number: '+1234567890',
          role: 'rider'
        },
        {
          email: 'driver@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test Driver',
          phone_number: '+0987654321',
          role: 'driver'
        }
      ])
      .returning()
      .execute();

    // Create test ride
    await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        driver_id: driver.id,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'completed',
        fare: '30.00'
      })
      .execute();

    const input: GetUserRidesInput = {
      user_id: driver.id,
      limit: 10,
      offset: 0
    };

    const result = await getUserRides(input);

    expect(result).toHaveLength(1);
    expect(result[0].driver_id).toBe(driver.id);
    expect(result[0].rider_id).toBe(rider.id);
    expect(result[0].fare).toBe(30.00);
    expect(typeof result[0].fare).toBe('number');
  });

  it('should fetch rides where user is both rider and driver in different rides', async () => {
    // Create test users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        {
          email: 'user1@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test User 1',
          phone_number: '+1111111111',
          role: 'driver'
        },
        {
          email: 'user2@test.com',
          password_hash: 'hashed_password',
          full_name: 'Test User 2',
          phone_number: '+2222222222',
          role: 'driver'
        }
      ])
      .returning()
      .execute();

    // Create rides where user1 is sometimes rider, sometimes driver
    await db.insert(ridesTable)
      .values([
        {
          rider_id: user1.id,
          driver_id: user2.id,
          pickup_address: 'As Rider - Pickup',
          destination_address: 'As Rider - Destination',
          status: 'completed',
          fare: '15.25'
        },
        {
          rider_id: user2.id,
          driver_id: user1.id,
          pickup_address: 'As Driver - Pickup',
          destination_address: 'As Driver - Destination',
          status: 'completed',
          fare: '22.75'
        }
      ])
      .execute();

    const input: GetUserRidesInput = {
      user_id: user1.id,
      limit: 10,
      offset: 0
    };

    const result = await getUserRides(input);

    expect(result).toHaveLength(2);
    
    // Check that both rides are included (user1 as rider and as driver)
    const asRider = result.find(ride => ride.rider_id === user1.id);
    const asDriver = result.find(ride => ride.driver_id === user1.id);
    
    expect(asRider).toBeDefined();
    expect(asDriver).toBeDefined();
    expect(asRider?.fare).toBe(15.25);
    expect(asDriver?.fare).toBe(22.75);
  });

  it('should handle pagination correctly', async () => {
    // Create test user
    const [rider] = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();

    // Create multiple rides
    const rideValues = Array.from({ length: 5 }, (_, i) => ({
      rider_id: rider.id,
      pickup_address: `Pickup ${i + 1}`,
      destination_address: `Destination ${i + 1}`,
      status: 'completed' as const,
      fare: `${(i + 1) * 10}.00`
    }));

    await db.insert(ridesTable)
      .values(rideValues)
      .execute();

    // Test first page
    const firstPageInput: GetUserRidesInput = {
      user_id: rider.id,
      limit: 2,
      offset: 0
    };

    const firstPage = await getUserRides(firstPageInput);
    expect(firstPage).toHaveLength(2);

    // Test second page
    const secondPageInput: GetUserRidesInput = {
      user_id: rider.id,
      limit: 2,
      offset: 2
    };

    const secondPage = await getUserRides(secondPageInput);
    expect(secondPage).toHaveLength(2);

    // Verify no overlap between pages
    const firstPageIds = firstPage.map(ride => ride.id);
    const secondPageIds = secondPage.map(ride => ride.id);
    expect(firstPageIds.some(id => secondPageIds.includes(id))).toBe(false);
  });

  it('should handle null fare values correctly', async () => {
    // Create test users
    const [rider] = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();

    // Create ride with null fare
    await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'requested',
        fare: null
      })
      .execute();

    const input: GetUserRidesInput = {
      user_id: rider.id,
      limit: 10,
      offset: 0
    };

    const result = await getUserRides(input);

    expect(result).toHaveLength(1);
    expect(result[0].fare).toBeNull();
  });

  it('should return empty array for user with no rides', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();

    const input: GetUserRidesInput = {
      user_id: user.id,
      limit: 10,
      offset: 0
    };

    const result = await getUserRides(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should use default pagination values when not provided', async () => {
    // Create test user
    const [rider] = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();

    // Create test ride
    await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'completed',
        fare: '15.50'
      })
      .execute();

    // Test without explicit limit and offset
    const input: GetUserRidesInput = {
      user_id: rider.id
    };

    const result = await getUserRides(input);

    expect(result).toHaveLength(1);
    expect(result[0].rider_id).toBe(rider.id);
  });

  it('should order rides by requested_at in descending order', async () => {
    // Create test user
    const [rider] = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Rider',
        phone_number: '+1234567890',
        role: 'rider'
      })
      .returning()
      .execute();

    // Create rides with different requested_at times
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const [oldestRide] = await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        pickup_address: 'Oldest Ride',
        destination_address: 'Oldest Destination',
        status: 'completed',
        fare: '10.00',
        requested_at: twoDaysAgo
      })
      .returning()
      .execute();

    const [middleRide] = await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        pickup_address: 'Middle Ride',
        destination_address: 'Middle Destination',
        status: 'completed',
        fare: '20.00',
        requested_at: yesterday
      })
      .returning()
      .execute();

    const [newestRide] = await db.insert(ridesTable)
      .values({
        rider_id: rider.id,
        pickup_address: 'Newest Ride',
        destination_address: 'Newest Destination',
        status: 'completed',
        fare: '30.00',
        requested_at: now
      })
      .returning()
      .execute();

    const input: GetUserRidesInput = {
      user_id: rider.id,
      limit: 10,
      offset: 0
    };

    const result = await getUserRides(input);

    expect(result).toHaveLength(3);
    
    // Verify descending order by requested_at
    expect(result[0].id).toBe(newestRide.id);
    expect(result[1].id).toBe(middleRide.id);
    expect(result[2].id).toBe(oldestRide.id);
    
    // Verify dates are in descending order
    expect(result[0].requested_at >= result[1].requested_at).toBe(true);
    expect(result[1].requested_at >= result[2].requested_at).toBe(true);
  });
});