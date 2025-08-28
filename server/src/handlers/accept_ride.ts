import { db } from '../db';
import { ridesTable, driverProfilesTable, usersTable } from '../db/schema';
import { type AcceptRideInput, type Ride } from '../schema';
import { eq, and } from 'drizzle-orm';

export const acceptRide = async (input: AcceptRideInput): Promise<Ride> => {
  try {
    // First, validate the ride exists and is in 'requested' status
    const existingRides = await db.select()
      .from(ridesTable)
      .where(
        and(
          eq(ridesTable.id, input.ride_id),
          eq(ridesTable.status, 'requested')
        )
      )
      .execute();

    if (existingRides.length === 0) {
      throw new Error('Ride not found or not available for acceptance');
    }

    // Validate driver exists and has an available driver profile
    const driverProfiles = await db.select()
      .from(driverProfilesTable)
      .innerJoin(usersTable, eq(driverProfilesTable.user_id, usersTable.id))
      .where(
        and(
          eq(usersTable.id, input.driver_id),
          eq(usersTable.role, 'driver'),
          eq(driverProfilesTable.status, 'available')
        )
      )
      .execute();

    if (driverProfiles.length === 0) {
      throw new Error('Driver not found or not available');
    }

    const driverProfileId = driverProfiles[0].driver_profiles.id;

    // Update the ride with driver assignment and status
    const updatedRides = await db.update(ridesTable)
      .set({
        driver_id: input.driver_id,
        status: 'accepted',
        accepted_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(ridesTable.id, input.ride_id))
      .returning()
      .execute();

    // Update driver status to busy
    await db.update(driverProfilesTable)
      .set({
        status: 'busy',
        updated_at: new Date()
      })
      .where(eq(driverProfilesTable.id, driverProfileId))
      .execute();

    const updatedRide = updatedRides[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedRide,
      fare: updatedRide.fare ? parseFloat(updatedRide.fare) : null
    };
  } catch (error) {
    console.error('Ride acceptance failed:', error);
    throw error;
  }
};