import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['rider', 'driver']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Driver availability enum
export const driverStatusSchema = z.enum(['available', 'unavailable', 'busy']);
export type DriverStatus = z.infer<typeof driverStatusSchema>;

// Ride status enum
export const rideStatusSchema = z.enum([
  'requested',
  'accepted',
  'driver_en_route', 
  'driver_arrived',
  'in_progress',
  'completed',
  'cancelled'
]);
export type RideStatus = z.infer<typeof rideStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  phone_number: z.string().nullable(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Driver profile schema
export const driverProfileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  license_number: z.string(),
  vehicle_make: z.string(),
  vehicle_model: z.string(),
  vehicle_year: z.number().int(),
  vehicle_plate: z.string(),
  status: driverStatusSchema,
  rating: z.number().nullable(),
  total_rides: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DriverProfile = z.infer<typeof driverProfileSchema>;

// Ride schema
export const rideSchema = z.object({
  id: z.number(),
  rider_id: z.number(),
  driver_id: z.number().nullable(),
  pickup_address: z.string(),
  pickup_latitude: z.number().nullable(),
  pickup_longitude: z.number().nullable(),
  destination_address: z.string(),
  destination_latitude: z.number().nullable(),
  destination_longitude: z.number().nullable(),
  status: rideStatusSchema,
  fare: z.number().nullable(),
  distance: z.number().nullable(),
  duration: z.number().int().nullable(),
  requested_at: z.coerce.date(),
  accepted_at: z.coerce.date().nullable(),
  started_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Ride = z.infer<typeof rideSchema>;

// Input schemas for user operations
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone_number: z.string().nullable(),
  role: userRoleSchema
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Input schemas for driver operations
export const createDriverProfileInputSchema = z.object({
  user_id: z.number(),
  license_number: z.string(),
  vehicle_make: z.string(),
  vehicle_model: z.string(),
  vehicle_year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  vehicle_plate: z.string()
});

export type CreateDriverProfileInput = z.infer<typeof createDriverProfileInputSchema>;

export const updateDriverStatusInputSchema = z.object({
  driver_id: z.number(),
  status: driverStatusSchema
});

export type UpdateDriverStatusInput = z.infer<typeof updateDriverStatusInputSchema>;

// Input schemas for ride operations
export const requestRideInputSchema = z.object({
  rider_id: z.number(),
  pickup_address: z.string(),
  pickup_latitude: z.number().optional(),
  pickup_longitude: z.number().optional(),
  destination_address: z.string(),
  destination_latitude: z.number().optional(),
  destination_longitude: z.number().optional()
});

export type RequestRideInput = z.infer<typeof requestRideInputSchema>;

export const acceptRideInputSchema = z.object({
  ride_id: z.number(),
  driver_id: z.number()
});

export type AcceptRideInput = z.infer<typeof acceptRideInputSchema>;

export const updateRideStatusInputSchema = z.object({
  ride_id: z.number(),
  status: rideStatusSchema,
  fare: z.number().positive().optional()
});

export type UpdateRideStatusInput = z.infer<typeof updateRideStatusInputSchema>;

// Query input schemas
export const getUserRidesInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetUserRidesInput = z.infer<typeof getUserRidesInputSchema>;

export const getAvailableRidesInputSchema = z.object({
  driver_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetAvailableRidesInput = z.infer<typeof getAvailableRidesInputSchema>;