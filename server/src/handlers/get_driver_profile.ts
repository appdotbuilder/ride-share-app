import { db } from '../db';
import { driverProfilesTable } from '../db/schema';
import { type DriverProfile } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDriverProfile(userId: number): Promise<DriverProfile | null> {
  try {
    // Query driver profile by user_id
    const result = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, userId))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const profile = result[0];
    
    // Convert numeric fields back to numbers and handle nullables
    return {
      ...profile,
      rating: profile.rating || null, // Keep null if no rating
    };
  } catch (error) {
    console.error('Driver profile fetch failed:', error);
    throw error;
  }
}