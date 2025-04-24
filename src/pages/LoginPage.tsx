import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_AUTH_URL, API_ENDPOINTS, API_URL } from '@/config';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!password || password.length < 1) {
      setError('Please enter your password');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Login form submitted with email:', email);
      await login(email, password);
      // AuthContext will handle navigation
    } catch (error: any) {
      console.error('Login error from login page:', error);
      
      // Check for specific error types
      if (error.response) {
        console.error('Login error status:', error.response.status);
        console.error('Login error details:', error.response.data);
        
        if (error.response.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else if (error.response.status === 403) {
          setError('Access forbidden. Please check your login information.');
        } else {
          setError('Login failed: ' + (error.message || 'Unknown error'));
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // For testing/debugging
  const useTestAccount = () => {
    setEmail('test123@example.com');
    setPassword('test123');
  };
  
  // Direct test login bypass
  const handleDirectLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Using direct test login endpoint');
      // Fix URL construction to avoid duplicate /auth path
      const testLoginUrl = `${API_URL}/auth${API_ENDPOINTS.auth.testLogin}`;
      console.log('Using corrected test login URL:', testLoginUrl);
      
      const response = await fetch(testLoginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Test login failed: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Test login successful:', data);
      
      // Store tokens and navigate
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      navigate('/app');
      
    } catch (error) {
      console.error('Test login error:', error);
      setError('Test login failed. Please check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-500 text-red-500 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          <p className="text-sm text-gray-500 mb-2">
            Test account options:
          </p>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-500" 
              onClick={useTestAccount}
            >
              Fill Test Credentials
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-green-500" 
              onClick={handleDirectLogin}
            >
              Direct Test Login
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}; 