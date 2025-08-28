import { db } from '../db';
import { driverProfilesTable, usersTable } from '../db/schema';
import { type CreateDriverProfileInput, type DriverProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const createDriverProfile = async (input: CreateDriverProfileInput): Promise<DriverProfile> => {
  try {
    // First, validate that user exists and has driver role
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error('User not found');
    }

    const user = existingUsers[0];
    if (user.role !== 'driver') {
      throw new Error('User must have driver role to create driver profile');
    }

    // Check if driver profile already exists for this user
    const existingProfiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, input.user_id))
      .execute();

    if (existingProfiles.length > 0) {
      throw new Error('Driver profile already exists for this user');
    }

    // Insert driver profile record
    const result = await db.insert(driverProfilesTable)
      .values({
        user_id: input.user_id,
        license_number: input.license_number,
        vehicle_make: input.vehicle_make,
        vehicle_model: input.vehicle_model,
        vehicle_year: input.vehicle_year,
        vehicle_plate: input.vehicle_plate,
        status: 'unavailable', // Default status
        rating: null, // No initial rating
        total_rides: 0 // Start with 0 rides
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Driver profile creation failed:', error);
    throw error;
  }
};