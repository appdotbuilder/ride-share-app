import { db } from '../db';
import { ridesTable } from '../db/schema';
import { type UpdateRideStatusInput, type Ride } from '../schema';
import { eq } from 'drizzle-orm';

export const updateRideStatus = async (input: UpdateRideStatusInput): Promise<Ride> => {
  try {
    // First, get the current ride to validate status transition
    const existingRides = await db.select()
      .from(ridesTable)
      .where(eq(ridesTable.id, input.ride_id))
      .execute();

    if (existingRides.length === 0) {
      throw new Error(`Ride with ID ${input.ride_id} not found`);
    }

    const existingRide = existingRides[0];

    // Validate status transitions
    validateStatusTransition(existingRide.status, input.status);

    // Prepare update values
    const updateValues: Record<string, any> = {
      status: input.status,
      updated_at: new Date()
    };

    // Set timestamps based on status
    if (input.status === 'driver_en_route' && !existingRide['accepted_at']) {
      updateValues['accepted_at'] = new Date();
    }
    
    if (input.status === 'in_progress' && !existingRide['started_at']) {
      updateValues['started_at'] = new Date();
    }
    
    if (input.status === 'completed' && !existingRide['completed_at']) {
      updateValues['completed_at'] = new Date();
    }

    // Set fare if provided and ride is completed
    if (input.fare !== undefined) {
      if (input.status !== 'completed') {
        throw new Error('Fare can only be set when ride status is completed');
      }
      updateValues['fare'] = input.fare.toString(); // Convert to string for numeric column
    }

    // Update the ride
    const result = await db.update(ridesTable)
      .set(updateValues)
      .where(eq(ridesTable.id, input.ride_id))
      .returning()
      .execute();

    const updatedRide = result[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...updatedRide,
      fare: updatedRide.fare ? parseFloat(updatedRide.fare) : null
    };
  } catch (error) {
    console.error('Ride status update failed:', error);
    throw error;
  }
};

function validateStatusTransition(currentStatus: string, newStatus: string): void {
  const validTransitions: Record<string, string[]> = {
    'requested': ['accepted', 'cancelled'],
    'accepted': ['driver_en_route', 'cancelled'],
    'driver_en_route': ['driver_arrived', 'cancelled'],
    'driver_arrived': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled'],
    'completed': [], // Terminal state
    'cancelled': [] // Terminal state
  };

  const allowedNextStates = validTransitions[currentStatus] || [];
  
  if (!allowedNextStates.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
  }
}