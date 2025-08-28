import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  pgEnum,
  real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['rider', 'driver']);
export const driverStatusEnum = pgEnum('driver_status', ['available', 'unavailable', 'busy']);
export const rideStatusEnum = pgEnum('ride_status', [
  'requested',
  'accepted', 
  'driver_en_route',
  'driver_arrived',
  'in_progress',
  'completed',
  'cancelled'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  phone_number: text('phone_number'),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Driver profiles table
export const driverProfilesTable = pgTable('driver_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  license_number: text('license_number').notNull(),
  vehicle_make: text('vehicle_make').notNull(),
  vehicle_model: text('vehicle_model').notNull(),
  vehicle_year: integer('vehicle_year').notNull(),
  vehicle_plate: text('vehicle_plate').notNull(),
  status: driverStatusEnum('status').notNull().default('unavailable'),
  rating: real('rating'),
  total_rides: integer('total_rides').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Rides table
export const ridesTable = pgTable('rides', {
  id: serial('id').primaryKey(),
  rider_id: integer('rider_id').notNull().references(() => usersTable.id),
  driver_id: integer('driver_id').references(() => usersTable.id),
  pickup_address: text('pickup_address').notNull(),
  pickup_latitude: real('pickup_latitude'),
  pickup_longitude: real('pickup_longitude'),
  destination_address: text('destination_address').notNull(),
  destination_latitude: real('destination_latitude'),
  destination_longitude: real('destination_longitude'),
  status: rideStatusEnum('status').notNull().default('requested'),
  fare: numeric('fare', { precision: 10, scale: 2 }),
  distance: real('distance'),
  duration: integer('duration'),
  requested_at: timestamp('requested_at').defaultNow().notNull(),
  accepted_at: timestamp('accepted_at'),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  driverProfile: one(driverProfilesTable, {
    fields: [usersTable.id],
    references: [driverProfilesTable.user_id],
  }),
  ridesAsRider: many(ridesTable, { relationName: 'rider' }),
  ridesAsDriver: many(ridesTable, { relationName: 'driver' }),
}));

export const driverProfilesRelations = relations(driverProfilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [driverProfilesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const ridesRelations = relations(ridesTable, ({ one }) => ({
  rider: one(usersTable, {
    fields: [ridesTable.rider_id],
    references: [usersTable.id],
    relationName: 'rider',
  }),
  driver: one(usersTable, {
    fields: [ridesTable.driver_id],
    references: [usersTable.id],
    relationName: 'driver',
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type DriverProfile = typeof driverProfilesTable.$inferSelect;
export type NewDriverProfile = typeof driverProfilesTable.$inferInsert;

export type Ride = typeof ridesTable.$inferSelect;
export type NewRide = typeof ridesTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  driverProfiles: driverProfilesTable,
  rides: ridesTable
};