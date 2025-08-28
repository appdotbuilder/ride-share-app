import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { User, RegisterUserInput, LoginUserInput, UserRole } from '../../../server/src/schema';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginData, setLoginData] = useState<LoginUserInput>({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<RegisterUserInput>({
    email: '',
    password: '',
    full_name: '',
    phone_number: null,
    role: 'rider'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await trpc.loginUser.mutate(loginData);
      onLogin(user);
    } catch (error) {
      console.error('Login failed:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await trpc.registerUser.mutate(registerData);
      onLogin(user);
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚗</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RideShare</h1>
          <p className="text-gray-600">Your journey starts here</p>
        </div>

        {/* Auth Tabs */}
        <Card className="shadow-lg">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {error && (
                <Alert className="mb-4" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginUserInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      placeholder="John Doe"
                      value={registerData.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterUserInput) => ({ ...prev, full_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Phone Number (Optional)</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={registerData.phone_number || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterUserInput) => ({
                          ...prev,
                          phone_number: e.target.value || null
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Choose a strong password"
                      value={registerData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterUserInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>I want to:</Label>
                    <RadioGroup
                      value={registerData.role}
                      onValueChange={(value: UserRole) =>
                        setRegisterData((prev: RegisterUserInput) => ({ ...prev, role: value }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rider" id="rider" />
                        <Label htmlFor="rider" className="flex items-center space-x-2">
                          <span>🙋</span>
                          <div>
                            <div className="font-medium">Request Rides</div>
                            <div className="text-sm text-gray-500">Get rides to your destination</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="driver" id="driver" />
                        <Label htmlFor="driver" className="flex items-center space-x-2">
                          <span>👨‍💼</span>
                          <div>
                            <div className="font-medium">Provide Rides</div>
                            <div className="text-sm text-gray-500">Drive and earn money</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}