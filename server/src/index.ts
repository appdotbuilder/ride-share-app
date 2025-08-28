import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  registerUserInputSchema,
  loginUserInputSchema,
  createDriverProfileInputSchema,
  updateDriverStatusInputSchema,
  requestRideInputSchema,
  acceptRideInputSchema,
  updateRideStatusInputSchema,
  getUserRidesInputSchema,
  getAvailableRidesInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createDriverProfile } from './handlers/create_driver_profile';
import { updateDriverStatus } from './handlers/update_driver_status';
import { requestRide } from './handlers/request_ride';
import { acceptRide } from './handlers/accept_ride';
import { updateRideStatus } from './handlers/update_ride_status';
import { getUserRides } from './handlers/get_user_rides';
import { getAvailableRides } from './handlers/get_available_rides';
import { getRideStatus } from './handlers/get_ride_status';
import { getDriverProfile } from './handlers/get_driver_profile';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Driver profile routes
  createDriverProfile: publicProcedure
    .input(createDriverProfileInputSchema)
    .mutation(({ input }) => createDriverProfile(input)),

  getDriverProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDriverProfile(input.userId)),

  updateDriverStatus: publicProcedure
    .input(updateDriverStatusInputSchema)
    .mutation(({ input }) => updateDriverStatus(input)),

  // Ride management routes
  requestRide: publicProcedure
    .input(requestRideInputSchema)
    .mutation(({ input }) => requestRide(input)),

  acceptRide: publicProcedure
    .input(acceptRideInputSchema)
    .mutation(({ input }) => acceptRide(input)),

  updateRideStatus: publicProcedure
    .input(updateRideStatusInputSchema)
    .mutation(({ input }) => updateRideStatus(input)),

  getRideStatus: publicProcedure
    .input(z.object({ rideId: z.number() }))
    .query(({ input }) => getRideStatus(input.rideId)),

  // Ride history and listing routes
  getUserRides: publicProcedure
    .input(getUserRidesInputSchema)
    .query(({ input }) => getUserRides(input)),

  getAvailableRides: publicProcedure
    .input(getAvailableRidesInputSchema)
    .query(({ input }) => getAvailableRides(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();