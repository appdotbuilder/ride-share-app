import { db } from '../db';
import { ridesTable } from '../db/schema';
import { type GetUserRidesInput, type Ride } from '../schema';
import { eq, or, desc } from 'drizzle-orm';

export const getUserRides = async (input: GetUserRidesInput): Promise<Ride[]> => {
  try {
    // Apply pagination defaults
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    // Build the complete query at once to avoid TypeScript issues
    const results = await db.select()
      .from(ridesTable)
      .where(
        or(
          eq(ridesTable.rider_id, input.user_id),
          eq(ridesTable.driver_id, input.user_id)
        )
      )
      .orderBy(desc(ridesTable.requested_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(ride => ({
      ...ride,
      fare: ride.fare ? parseFloat(ride.fare) : null,
    }));
  } catch (error) {
    console.error('Failed to fetch user rides:', error);
    throw error;
  }
};