import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Ride } from '../../../server/src/schema';

interface RideStatusCardProps {
  ride: Ride;
  isCurrentRide?: boolean;
  showAcceptButton?: boolean;
  onAcceptRide?: (rideId: number) => void;
  acceptLoading?: boolean;
}

export function RideStatusCard({ 
  ride, 
  isCurrentRide = false, 
  showAcceptButton = false,
  onAcceptRide,
  acceptLoading = false
}: RideStatusCardProps) {
  
  const getStatusConfig = (status: string) => {
    const configs = {
      'requested': { 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: '🕐', 
        text: 'Finding Driver',
        bgClass: 'status-requested',
        pulse: true
      },
      'accepted': { 
        color: 'bg-blue-100 text-blue-800', 
        icon: '✅', 
        text: 'Driver Assigned',
        bgClass: 'status-in-progress',
        pulse: false
      },
      'driver_en_route': { 
        color: 'bg-orange-100 text-orange-800', 
        icon: '🚗', 
        text: 'Driver En Route',
        bgClass: 'status-in-progress',
        pulse: true
      },
      'driver_arrived': { 
        color: 'bg-green-100 text-green-800', 
        icon: '📍', 
        text: 'Driver Arrived',
        bgClass: 'status-in-progress',
        pulse: true
      },
      'in_progress': { 
        color: 'bg-purple-100 text-purple-800', 
        icon: '🚙', 
        text: 'In Progress',
        bgClass: 'status-in-progress',
        pulse: true
      },
      'completed': { 
        color: 'bg-gray-100 text-gray-800', 
        icon: '✓', 
        text: 'Completed',
        bgClass: 'status-completed',
        pulse: false
      },
      'cancelled': { 
        color: 'bg-red-100 text-red-800', 
        icon: '❌', 
        text: 'Cancelled',
        bgClass: '',
        pulse: false
      }
    };

    return configs[status as keyof typeof configs] || configs.requested;
  };

  const statusConfig = getStatusConfig(ride.status);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={`
      ride-card border-2 transition-all duration-300
      ${isCurrentRide ? 'border-blue-300 shadow-lg' : 'border-gray-200'}
      ${statusConfig.bgClass}
    `}>
      <CardContent className="p-6">
        {/* Header with Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge 
                variant="secondary" 
                className={`
                  ${statusConfig.color} font-medium
                  ${statusConfig.pulse ? 'ride-status-pulse' : ''}
                `}
              >
                <span className="mr-1">{statusConfig.icon}</span>
                {statusConfig.text}
              </Badge>
              {isCurrentRide && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Current Ride
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {formatDate(ride.requested_at)} • Requested at {formatTime(ride.requested_at)}
            </div>
          </div>
        </div>

        {/* Route Information */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Pickup
              </Label>
              <p className="font-medium text-gray-900">{ride.pickup_address}</p>
            </div>
          </div>
          
          <div className="ml-1.5 h-6 w-0.5 bg-gray-300"></div>
          
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Destination
              </Label>
              <p className="font-medium text-gray-900">{ride.destination_address}</p>
            </div>
          </div>
        </div>

        {/* Ride Details */}
        {(ride.fare || ride.distance || ride.duration) && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              {ride.fare && (
                <div>
                  <p className="text-lg font-semibold text-green-600">${ride.fare.toFixed(2)}</p>
                  <Label className="text-xs text-gray-500">Fare</Label>
                </div>
              )}
              {ride.distance && (
                <div>
                  <p className="text-lg font-semibold text-blue-600">{ride.distance.toFixed(1)} mi</p>
                  <Label className="text-xs text-gray-500">Distance</Label>
                </div>
              )}
              {ride.duration && (
                <div>
                  <p className="text-lg font-semibold text-purple-600">{ride.duration} min</p>
                  <Label className="text-xs text-gray-500">Duration</Label>
                </div>
              )}
            </div>
          </>
        )}

        {/* Timestamps */}
        {(ride.accepted_at || ride.started_at || ride.completed_at) && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm text-gray-600">
              {ride.accepted_at && (
                <div className="flex justify-between">
                  <span>Accepted:</span>
                  <span>{formatTime(ride.accepted_at)}</span>
                </div>
              )}
              {ride.started_at && (
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span>{formatTime(ride.started_at)}</span>
                </div>
              )}
              {ride.completed_at && (
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span>{formatTime(ride.completed_at)}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Accept Button for Drivers */}
        {showAcceptButton && onAcceptRide && (
          <>
            <Separator className="my-4" />
            <button
              onClick={() => onAcceptRide(ride.id)}
              disabled={acceptLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                         text-white font-medium py-3 px-4 rounded-lg 
                         transition-colors duration-200 ease-in-out
                         flex items-center justify-center space-x-2"
            >
              {acceptLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>Accept Ride</span>
                </>
              )}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}