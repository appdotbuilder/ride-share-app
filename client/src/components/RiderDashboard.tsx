import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RideStatusCard } from '@/components/RideStatusCard';
import type { User, Ride, RequestRideInput } from '../../../server/src/schema';

interface RiderDashboardProps {
  user: User;
}

export function RiderDashboard({ user }: RiderDashboardProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rideRequest, setRideRequest] = useState<RequestRideInput>({
    rider_id: user.id,
    pickup_address: '',
    destination_address: ''
  });

  // Load user rides
  const loadRides = useCallback(async () => {
    try {
      const userRides = await trpc.getUserRides.query({ user_id: user.id });
      setRides(userRides);
      
      // Find current active ride
      const activeRide = userRides.find((ride: Ride) => 
        ['requested', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress'].includes(ride.status)
      );
      setCurrentRide(activeRide || null);
    } catch (error) {
      console.error('Failed to load rides:', error);
      setError('Failed to load your ride history');
    }
  }, [user.id]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const newRide = await trpc.requestRide.mutate(rideRequest);
      setRides((prev: Ride[]) => [newRide, ...prev]);
      setCurrentRide(newRide);
      setRideRequest({
        rider_id: user.id,
        pickup_address: '',
        destination_address: ''
      });
      setSuccess('Ride requested successfully! Looking for available drivers...');
    } catch (error) {
      console.error('Failed to request ride:', error);
      setError('Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* Current Ride Status */}
      {currentRide && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <span>🚗</span>
            <span>Current Ride</span>
          </h2>
          <RideStatusCard ride={currentRide} isCurrentRide={true} />
        </div>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request">Request Ride</TabsTrigger>
          <TabsTrigger value="history">Ride History</TabsTrigger>
        </TabsList>

        {/* Request Ride Tab */}
        <TabsContent value="request" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🚕</span>
                <span>Request a New Ride</span>
              </CardTitle>
              <CardDescription>
                Enter your pickup location and destination to request a ride
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestRide} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Address</Label>
                  <Input
                    id="pickup"
                    placeholder="e.g., 123 Main Street, City, State"
                    value={rideRequest.pickup_address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRideRequest((prev: RequestRideInput) => ({
                        ...prev,
                        pickup_address: e.target.value
                      }))
                    }
                    required
                    disabled={!!currentRide}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination Address</Label>
                  <Input
                    id="destination"
                    placeholder="e.g., 456 Oak Avenue, City, State"
                    value={rideRequest.destination_address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRideRequest((prev: RequestRideInput) => ({
                        ...prev,
                        destination_address: e.target.value
                      }))
                    }
                    required
                    disabled={!!currentRide}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !!currentRide}
                  size="lg"
                >
                  {loading ? 'Requesting Ride...' : currentRide ? 'You have an active ride' : '🚗 Request Ride'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ride History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📋</span>
                <span>Your Rides</span>
              </CardTitle>
              <CardDescription>
                View all your past and current rides
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rides.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🚗</div>
                  <p className="text-gray-500">No rides yet. Request your first ride!</p>
                </div>
              ) : (
                <div className="space-y-4 ride-list max-h-96 overflow-y-auto">
                  {rides.map((ride: Ride) => (
                    <RideStatusCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}