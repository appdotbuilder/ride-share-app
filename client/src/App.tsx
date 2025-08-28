import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { AuthScreen } from '@/components/AuthScreen';
import { RiderDashboard } from '@/components/RiderDashboard';
import { DriverDashboard } from '@/components/DriverDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (userData: User) => {
    setUser(userData);
    localStorage.setItem('rideshare_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rideshare_user');
  };

  // Check for stored user data on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('rideshare_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('rideshare_user');
      }
    }
  }, []);

  // If not logged in, show authentication screen
  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🚗</div>
              <h1 className="text-xl font-bold text-gray-900">RideShare</h1>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                {user.role}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.full_name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'rider' ? (
          <RiderDashboard user={user} />
        ) : (
          <DriverDashboard user={user} />
        )}
      </main>
    </div>
  );
}

export default App;