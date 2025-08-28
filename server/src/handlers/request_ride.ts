import { db } from '../db';
import { ridesTable, usersTable } from '../db/schema';
import { type RequestRideInput, type Ride } from '../schema';
import { eq } from 'drizzle-orm';

export const requestRide = async (input: RequestRideInput): Promise<Ride> => {
  try {
    // First, validate that the rider exists
    const rider = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.rider_id))
      .execute();

    if (rider.length === 0) {
      throw new Error(`Rider with id ${input.rider_id} not found`);
    }

    // Insert the ride request
    const result = await db.insert(ridesTable)
      .values({
        rider_id: input.rider_id,
        pickup_address: input.pickup_address,
        pickup_latitude: input.pickup_latitude || null,
        pickup_longitude: input.pickup_longitude || null,
        destination_address: input.destination_address,
        destination_latitude: input.destination_latitude || null,
        destination_longitude: input.destination_longitude || null,
        status: 'requested'
      })
      .returning()
      .execute();

    const ride = result[0];
    
    // Convert numeric fields to proper types before returning
    return {
      ...ride,
      fare: ride.fare ? parseFloat(ride.fare) : null
    };
  } catch (error) {
    console.error('Ride request failed:', error);
    throw error;
  }
};