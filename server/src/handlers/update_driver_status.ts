import { db } from '../db';
import { driverProfilesTable } from '../db/schema';
import { type UpdateDriverStatusInput, type DriverProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDriverStatus = async (input: UpdateDriverStatusInput): Promise<DriverProfile> => {
  try {
    // Update driver status and get the updated record
    const result = await db.update(driverProfilesTable)
      .set({ 
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(driverProfilesTable.id, input.driver_id))
      .returning()
      .execute();

    // Check if driver profile was found and updated
    if (result.length === 0) {
      throw new Error(`Driver profile with id ${input.driver_id} not found`);
    }

    const driverProfile = result[0];
    
    // Convert numeric fields back to numbers for the response
    return {
      ...driverProfile,
      rating: driverProfile.rating !== null ? driverProfile.rating : null
    };
  } catch (error) {
    console.error('Driver status update failed:', error);
    throw error;
  }
};