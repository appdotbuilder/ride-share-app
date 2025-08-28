import { db } from '../db';
import { ridesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Ride } from '../schema';

export const getRideStatus = async (rideId: number): Promise<Ride> => {
  try {
    const result = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, rideId))
      .execute();

    if (result.length === 0) {
      throw new Error(`Ride with ID ${rideId} not found`);
    }

    const ride = result[0];
    
    // Convert numeric fields from strings to numbers
    return {
      ...ride,
      fare: ride.fare ? parseFloat(ride.fare) : null
    };
  } catch (error) {
    console.error('Failed to get ride status:', error);
    throw error;
  }
};