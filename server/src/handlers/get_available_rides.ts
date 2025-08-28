import { db } from '../db';
import { ridesTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { type GetAvailableRidesInput, type Ride } from '../schema';

export const getAvailableRides = async (input: GetAvailableRidesInput): Promise<Ride[]> => {
  try {
    // Apply pagination with defaults
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    // Build complete query in one chain
    const results = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.status, 'requested'))
      .orderBy(desc(ridesTable.requested_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(ride => ({
      ...ride,
      fare: ride.fare ? parseFloat(ride.fare) : null
    }));
  } catch (error) {
    console.error('Get available rides failed:', error);
    throw error;
  }
};