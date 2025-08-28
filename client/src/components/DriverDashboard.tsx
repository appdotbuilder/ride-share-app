import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { RideStatusCard } from '@/components/RideStatusCard';
import type { User, Ride, DriverProfile, CreateDriverProfileInput, DriverStatus } from '../../../server/src/schema';

interface DriverDashboardProps {
  user: User;
}

export function DriverDashboard({ user }: DriverDashboardProps) {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [profileForm, setProfileForm] = useState<CreateDriverProfileInput>({
    user_id: user.id,
    license_number: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    vehicle_plate: ''
  });

  // Load driver profile
  const loadDriverProfile = useCallback(async () => {
    try {
      const profile = await trpc.getDriverProfile.query({ userId: user.id });
      setDriverProfile(profile);
    } catch (error) {
      console.error('Failed to load driver profile:', error);
    }
  }, [user.id]);

  // Load available rides
  const loadAvailableRides = useCallback(async () => {
    if (!driverProfile) return;
    
    try {
      const rides = await trpc.getAvailableRides.query({ driver_id: driverProfile.id });
      setAvailableRides(rides);
    } catch (error) {
      console.error('Failed to load available rides:', error);
      setError('Failed to load available rides');
    }
  }, [driverProfile]);

  // Load my rides
  const loadMyRides = useCallback(async () => {
    try {
      const rides = await trpc.getUserRides.query({ user_id: user.id });
      setMyRides(rides);
    } catch (error) {
      console.error('Failed to load my rides:', error);
      setError('Failed to load your ride history');
    }
  }, [user.id]);

  useEffect(() => {
    loadDriverProfile();
  }, [loadDriverProfile]);

  useEffect(() => {
    if (driverProfile) {
      loadAvailableRides();
      loadMyRides();
    }
  }, [driverProfile, loadAvailableRides, loadMyRides]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const profile = await trpc.createDriverProfile.mutate(profileForm);
      setDriverProfile(profile);
      setSuccess('Driver profile created successfully!');
    } catch (error) {
      console.error('Failed to create driver profile:', error);
      setError('Failed to create driver profile. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (isAvailable: boolean) => {
    if (!driverProfile) return;

    const newStatus: DriverStatus = isAvailable ? 'available' : 'unavailable';
    setLoading(true);
    setError(null);

    try {
      await trpc.updateDriverStatus.mutate({
        driver_id: driverProfile.id,
        status: newStatus
      });
      
      setDriverProfile((prev: DriverProfile | null) => 
        prev ? { ...prev, status: newStatus } : null
      );
      
      if (isAvailable) {
        loadAvailableRides();
      } else {
        setAvailableRides([]);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      setError('Failed to update availability status');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = async (rideId: number) => {
    if (!driverProfile) return;

    setLoading(true);
    setError(null);

    try {
      await trpc.acceptRide.mutate({
        ride_id: rideId,
        driver_id: driverProfile.id
      });
      
      // Remove from available rides
      setAvailableRides((prev: Ride[]) => prev.filter((ride: Ride) => ride.id !== rideId));
      
      // Reload my rides to show the new accepted ride
      loadMyRides();
      
      setSuccess('Ride accepted! You can now proceed to pickup location.');
    } catch (error) {
      console.error('Failed to accept ride:', error);
      setError('Failed to accept ride. It may have been taken by another driver.');
    } finally {
      setLoading(false);
    }
  };



  // If no driver profile exists, show profile creation form
  if (!driverProfile) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>👨‍💼</span>
              <span>Complete Your Driver Profile</span>
            </CardTitle>
            <CardDescription>
              Please provide your vehicle information to start driving
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800 mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license">Driver's License Number</Label>
                  <Input
                    id="license"
                    placeholder="D123456789"
                    value={profileForm.license_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProfileForm((prev: CreateDriverProfileInput) => ({
                        ...prev,
                        license_number: e.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">License Plate</Label>
                  <Input
                    id="plate"
                    placeholder="ABC123"
                    value={profileForm.vehicle_plate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProfileForm((prev: CreateDriverProfileInput) => ({
                        ...prev,
                        vehicle_plate: e.target.value
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Vehicle Make</Label>
                  <Input
                    id="make"
                    placeholder="Toyota"
                    value={profileForm.vehicle_make}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProfileForm((prev: CreateDriverProfileInput) => ({
                        ...prev,
                        vehicle_make: e.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Vehicle Model</Label>
                  <Input
                    id="model"
                    placeholder="Camry"
                    value={profileForm.vehicle_model}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProfileForm((prev: CreateDriverProfileInput) => ({
                        ...prev,
                        vehicle_model: e.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    value={profileForm.vehicle_year}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProfileForm((prev: CreateDriverProfileInput) => ({
                        ...prev,
                        vehicle_year: parseInt(e.target.value) || new Date().getFullYear()
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? 'Creating Profile...' : '🚗 Complete Profile & Start Driving'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Driver Status Card */}
      <Card className={`border-2 ${
        driverProfile.status === 'available' 
          ? 'border-green-200 bg-green-50' 
          : 'border-gray-200 bg-gray-50'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <span>👨‍💼</span>
              <span>Driver Status</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {driverProfile.vehicle_year} {driverProfile.vehicle_make} {driverProfile.vehicle_model}
                </p>
                <p className="text-xs text-gray-500">Plate: {driverProfile.vehicle_plate}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="availability-toggle" className="text-sm">
                  {driverProfile.status === 'available' ? 'Online' : 'Offline'}
                </Label>
                <Switch
                  id="availability-toggle"
                  checked={driverProfile.status === 'available'}
                  onCheckedChange={handleStatusToggle}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{driverProfile.total_rides}</p>
              <p className="text-sm text-gray-600">Total Rides</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {driverProfile.rating ? driverProfile.rating.toFixed(1) : 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Rating ⭐</p>
            </div>
            <div>
              <Badge 
                variant="secondary"
                className={
                  driverProfile.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : driverProfile.status === 'busy'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {driverProfile.status.charAt(0).toUpperCase() + driverProfile.status.slice(1)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

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
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Rides</TabsTrigger>
          <TabsTrigger value="history">My Rides</TabsTrigger>
        </TabsList>

        {/* Available Rides Tab */}
        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🚕</span>
                <span>Available Ride Requests</span>
              </CardTitle>
              <CardDescription>
                {driverProfile.status === 'available' 
                  ? 'Accept ride requests from passengers in your area'
                  : 'Go online to see available ride requests'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {driverProfile.status !== 'available' ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">😴</div>
                  <p className="text-gray-500">You're currently offline. Turn on availability to see ride requests.</p>
                </div>
              ) : availableRides.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-500">No ride requests available at the moment. Check back soon!</p>
                </div>
              ) : (
                <div className="space-y-4 ride-list max-h-96 overflow-y-auto">
                  {availableRides.map((ride: Ride) => (
                    <RideStatusCard 
                      key={ride.id} 
                      ride={ride}
                      showAcceptButton={true}
                      onAcceptRide={handleAcceptRide}
                      acceptLoading={loading}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Rides Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📋</span>
                <span>My Rides</span>
              </CardTitle>
              <CardDescription>
                View all rides you've completed or are currently providing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myRides.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🚗</div>
                  <p className="text-gray-500">No rides yet. Accept your first ride request!</p>
                </div>
              ) : (
                <div className="space-y-4 ride-list max-h-96 overflow-y-auto">
                  {myRides.map((ride: Ride) => (
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