import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ridesTable } from '../db/schema';
import { type GetAvailableRidesInput } from '../schema';
import { getAvailableRides } from '../handlers/get_available_rides';

describe('getAvailableRides', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return rides with requested status', async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      {
        email: 'rider1@example.com',
        password_hash: 'hashedpassword1',
        full_name: 'Rider One',
        phone_number: '1234567890',
        role: 'rider'
      },
      {
        email: 'rider2@example.com',
        password_hash: 'hashedpassword2',
        full_name: 'Rider Two',
        phone_number: '0987654321',
        role: 'rider'
      },
      {
        email: 'driver@example.com',
        password_hash: 'hashedpassword3',
        full_name: 'Driver One',
        phone_number: '5555555555',
        role: 'driver'
      }
    ]).returning().execute();

    // Create test rides with different statuses
    const rides = await db.insert(ridesTable).values([
      {
        rider_id: users[0].id,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'requested'
      },
      {
        rider_id: users[1].id,
        pickup_address: '789 Pine St',
        destination_address: '321 Elm Rd',
        status: 'requested'
      },
      {
        rider_id: users[0].id,
        driver_id: users[2].id,
        pickup_address: '555 Broadway',
        destination_address: '777 Park Ave',
        status: 'accepted'
      },
      {
        rider_id: users[1].id,
        driver_id: users[2].id,
        pickup_address: '999 Center St',
        destination_address: '111 First Ave',
        status: 'completed'
      }
    ]).returning().execute();

    const testInput: GetAvailableRidesInput = {
      driver_id: users[2].id
    };

    const result = await getAvailableRides(testInput);

    // Should return only rides with 'requested' status
    expect(result).toHaveLength(2);
    
    result.forEach(ride => {
      expect(ride.status).toEqual('requested');
      expect(ride.driver_id).toBeNull();
      expect(ride.id).toBeDefined();
      expect(ride.rider_id).toBeDefined();
      expect(ride.pickup_address).toBeDefined();
      expect(ride.destination_address).toBeDefined();
      expect(ride.requested_at).toBeInstanceOf(Date);
      expect(ride.created_at).toBeInstanceOf(Date);
    });

    // Verify specific rides are included
    const rideIds = result.map(r => r.id);
    expect(rideIds).toContain(rides[0].id);
    expect(rideIds).toContain(rides[1].id);
  });

  it('should apply pagination correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable).values({
      email: 'rider@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Rider',
      phone_number: '1234567890',
      role: 'rider'
    }).returning().execute();

    // Create multiple requested rides
    await db.insert(ridesTable).values([
      {
        rider_id: user[0].id,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'requested'
      },
      {
        rider_id: user[0].id,
        pickup_address: '789 Pine St',
        destination_address: '321 Elm Rd',
        status: 'requested'
      },
      {
        rider_id: user[0].id,
        pickup_address: '555 Broadway',
        destination_address: '777 Park Ave',
        status: 'requested'
      }
    ]).execute();

    const testInput: GetAvailableRidesInput = {
      driver_id: 1,
      limit: 2,
      offset: 0
    };

    const result = await getAvailableRides(testInput);

    expect(result).toHaveLength(2);
    result.forEach(ride => {
      expect(ride.status).toEqual('requested');
    });

    // Test offset
    const testInputWithOffset: GetAvailableRidesInput = {
      driver_id: 1,
      limit: 2,
      offset: 2
    };

    const resultWithOffset = await getAvailableRides(testInputWithOffset);
    expect(resultWithOffset).toHaveLength(1);
  });

  it('should return empty array when no requested rides exist', async () => {
    // Create test user
    const user = await db.insert(usersTable).values({
      email: 'rider@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Rider',
      phone_number: '1234567890',
      role: 'rider'
    }).returning().execute();

    // Create only non-requested rides
    await db.insert(ridesTable).values([
      {
        rider_id: user[0].id,
        pickup_address: '123 Main St',
        destination_address: '456 Oak Ave',
        status: 'completed'
      },
      {
        rider_id: user[0].id,
        pickup_address: '789 Pine St',
        destination_address: '321 Elm Rd',
        status: 'cancelled'
      }
    ]).execute();

    const testInput: GetAvailableRidesInput = {
      driver_id: 1
    };

    const result = await getAvailableRides(testInput);

    expect(result).toHaveLength(0);
  });

  it('should handle rides with numeric fields correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable).values({
      email: 'rider@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Rider',
      phone_number: '1234567890',
      role: 'rider'
    }).returning().execute();

    // Create ride with fare value
    await db.insert(ridesTable).values({
      rider_id: user[0].id,
      pickup_address: '123 Main St',
      destination_address: '456 Oak Ave',
      status: 'requested',
      fare: '25.50',
      distance: 5.2,
      duration: 15
    }).execute();

    const testInput: GetAvailableRidesInput = {
      driver_id: 1
    };

    const result = await getAvailableRides(testInput);

    expect(result).toHaveLength(1);
    
    const ride = result[0];
    expect(ride.fare).toEqual(25.50);
    expect(typeof ride.fare).toBe('number');
    expect(ride.distance).toEqual(5.2);
    expect(ride.duration).toEqual(15);
  });

  it('should order rides by requested_at descending', async () => {
    // Create test user
    const user = await db.insert(usersTable).values({
      email: 'rider@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Rider',
      phone_number: '1234567890',
      role: 'rider'
    }).returning().execute();

    // Create rides with different requested_at times
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(ridesTable).values([
      {
        rider_id: user[0].id,
        pickup_address: 'Old Request',
        destination_address: '456 Oak Ave',
        status: 'requested',
        requested_at: twoHoursAgo
      },
      {
        rider_id: user[0].id,
        pickup_address: 'New Request',
        destination_address: '321 Elm Rd',
        status: 'requested',
        requested_at: now
      },
      {
        rider_id: user[0].id,
        pickup_address: 'Middle Request',
        destination_address: '777 Park Ave',
        status: 'requested',
        requested_at: oneHourAgo
      }
    ]).execute();

    const testInput: GetAvailableRidesInput = {
      driver_id: 1
    };

    const result = await getAvailableRides(testInput);

    expect(result).toHaveLength(3);
    
    // Should be ordered newest first
    expect(result[0].pickup_address).toEqual('New Request');
    expect(result[1].pickup_address).toEqual('Middle Request');
    expect(result[2].pickup_address).toEqual('Old Request');

    // Verify dates are in descending order
    expect(result[0].requested_at.getTime()).toBeGreaterThan(result[1].requested_at.getTime());
    expect(result[1].requested_at.getTime()).toBeGreaterThan(result[2].requested_at.getTime());
  });

  it('should use default pagination when not provided', async () => {
    // Create test user
    const user = await db.insert(usersTable).values({
      email: 'rider@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Rider',
      phone_number: '1234567890',
      role: 'rider'
    }).returning().execute();

    // Create one requested ride
    await db.insert(ridesTable).values({
      rider_id: user[0].id,
      pickup_address: '123 Main St',
      destination_address: '456 Oak Ave',
      status: 'requested'
    }).execute();

    const testInput: GetAvailableRidesInput = {
      driver_id: 1
      // No limit or offset provided
    };

    const result = await getAvailableRides(testInput);

    // Should work with defaults and return the ride
    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('requested');
  });
});