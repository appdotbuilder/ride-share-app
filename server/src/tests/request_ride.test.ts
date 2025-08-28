import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ridesTable, usersTable } from '../db/schema';
import { type RequestRideInput } from '../schema';
import { requestRide } from '../handlers/request_ride';
import { eq } from 'drizzle-orm';

// Create a test user first
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'rider@test.com',
      password_hash: 'hashed_password',
      full_name: 'Test Rider',
      phone_number: '+1234567890',
      role: 'rider'
    })
    .returning()
    .execute();
  
  return result[0];
};

// Simple test input
const testInput: RequestRideInput = {
  rider_id: 1, // Will be updated with actual user ID
  pickup_address: '123 Main St, City, State',
  pickup_latitude: 40.7128,
  pickup_longitude: -74.0060,
  destination_address: '456 Oak Ave, City, State',
  destination_latitude: 40.7589,
  destination_longitude: -73.9851
};

describe('requestRide', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a ride request', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInput, rider_id: user.id };

    const result = await requestRide(input);

    // Basic field validation
    expect(result.rider_id).toEqual(user.id);
    expect(result.driver_id).toBeNull();
    expect(result.pickup_address).toEqual('123 Main St, City, State');
    expect(result.pickup_latitude).toEqual(40.7128);
    expect(result.pickup_longitude).toEqual(-74.0060);
    expect(result.destination_address).toEqual('456 Oak Ave, City, State');
    expect(result.destination_latitude).toEqual(40.7589);
    expect(result.destination_longitude).toEqual(-73.9851);
    expect(result.status).toEqual('requested');
    expect(result.fare).toBeNull();
    expect(result.distance).toBeNull();
    expect(result.duration).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.requested_at).toBeInstanceOf(Date);
    expect(result.accepted_at).toBeNull();
    expect(result.started_at).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save ride to database', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInput, rider_id: user.id };

    const result = await requestRide(input);

    // Query the database to verify the ride was saved
    const rides = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, result.id))
      .execute();

    expect(rides).toHaveLength(1);
    const savedRide = rides[0];
    expect(savedRide.rider_id).toEqual(user.id);
    expect(savedRide.pickup_address).toEqual('123 Main St, City, State');
    expect(savedRide.destination_address).toEqual('456 Oak Ave, City, State');
    expect(savedRide.status).toEqual('requested');
    expect(savedRide.driver_id).toBeNull();
    expect(savedRide.requested_at).toBeInstanceOf(Date);
  });

  it('should handle optional coordinates', async () => {
    // Create test user first
    const user = await createTestUser();
    
    // Test input without coordinates
    const inputWithoutCoords: RequestRideInput = {
      rider_id: user.id,
      pickup_address: '123 Main St, City, State',
      destination_address: '456 Oak Ave, City, State'
    };

    const result = await requestRide(inputWithoutCoords);

    expect(result.pickup_latitude).toBeNull();
    expect(result.pickup_longitude).toBeNull();
    expect(result.destination_latitude).toBeNull();
    expect(result.destination_longitude).toBeNull();
    expect(result.pickup_address).toEqual('123 Main St, City, State');
    expect(result.destination_address).toEqual('456 Oak Ave, City, State');
  });

  it('should throw error for non-existent rider', async () => {
    const inputWithInvalidRider = { ...testInput, rider_id: 999 };

    await expect(requestRide(inputWithInvalidRider)).rejects.toThrow(/rider with id 999 not found/i);
  });

  it('should set default status to requested', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInput, rider_id: user.id };

    const result = await requestRide(input);

    expect(result.status).toEqual('requested');
    
    // Verify in database as well
    const rides = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, result.id))
      .execute();

    expect(rides[0].status).toEqual('requested');
  });

  it('should set timestamps correctly', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInput, rider_id: user.id };

    const beforeTime = new Date();
    const result = await requestRide(input);
    const afterTime = new Date();

    // Check that timestamps are within reasonable range
    expect(result.requested_at >= beforeTime).toBe(true);
    expect(result.requested_at <= afterTime).toBe(true);
    expect(result.created_at >= beforeTime).toBe(true);
    expect(result.created_at <= afterTime).toBe(true);
    expect(result.updated_at >= beforeTime).toBe(true);
    expect(result.updated_at <= afterTime).toBe(true);

    // Check that future timestamps are null
    expect(result.accepted_at).toBeNull();
    expect(result.started_at).toBeNull();
    expect(result.completed_at).toBeNull();
  });
});