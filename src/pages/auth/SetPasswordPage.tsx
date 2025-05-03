import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BeakerIcon, LockKeyhole, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';

export default function SetPasswordPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!email || !token || !orgId) {
      setError('Missing required information (email, token, or organization)');
      return;
    }
    
    try {
      setLoading(true);
      
      // Make API call to set password
      const response = await axios.post(`${API_URL}/api/set-password/`, {
        email,
        password,
        password_confirm: confirmPassword,
        organization_id: orgId,
        invitation_token: token
      });
      
      console.log('Password set successfully:', response.data);
      
      // If we got tokens back, log the user in
      if (response.data.access && response.data.refresh) {
        // Store tokens
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        
        // Try to log in with the new credentials
        try {
          await login(email, password);
          toast.success('Password set successfully! Logging you in...');
          navigate('/app');
        } catch (loginError) {
          console.error('Auto-login failed after setting password:', loginError);
          toast.success('Password set successfully! Please log in.');
          navigate('/login');
        }
      } else {
        // No tokens returned, redirect to login
        toast.success('Password set successfully! Please log in.');
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Error setting password:', err);
      
      // Handle specific error messages from the API
      if (axios.isAxiosError(err) && err.response) {
        console.error('Server response:', err.response.data);
        
        if (typeof err.response.data === 'object') {
          const errorData = err.response.data;
          let errorMessage = 'Error setting password: ';
          
          Object.keys(errorData).forEach(key => {
            const value = errorData[key];
            if (Array.isArray(value)) {
              errorMessage += `${key}: ${value.join(', ')}. `;
            } else if (typeof value === 'object' && value !== null) {
              errorMessage += `${key}: ${JSON.stringify(value)}. `;
            } else {
              errorMessage += `${key}: ${value}. `;
            }
          });
          
          setError(errorMessage);
        } else {
          setError(err.response.data || 'An error occurred while setting your password.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:block relative flex-1">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500 to-primary-700">
          <div className="absolute inset-0 bg-enterprise-900 opacity-20 mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Set Your Password</h2>
            <p className="text-primary-100">
              Create a secure password to complete your account setup.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 lg:flex-none lg:max-w-md xl:max-w-lg order-first lg:order-last">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
            <div className="flex items-center">
              <BeakerIcon className="h-7 w-7 text-primary-600 mr-2" />
              <h1 className="text-2xl font-bold text-enterprise-900">KernLogic</h1>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-enterprise-900">Set Your Password</h2>
            <p className="mt-2 text-sm text-enterprise-600">
              Your account has already been created. Please set a password to access it.
            </p>
            {email && (
              <div className="mt-4 p-3 bg-primary-50 border border-primary-100 rounded-md">
                <p className="text-sm text-primary-600">Setting password for: <strong>{email}</strong></p>
              </div>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label 
                htmlFor="password" 
                className="block text-sm font-medium text-enterprise-700"
              >
                New Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-enterprise-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 border border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-enterprise-500">Minimum 6 characters</p>
            </div>

            <div>
              <Label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-enterprise-700"
              >
                Confirm Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-enterprise-400" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 border border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-danger-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-danger-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-danger-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth={true}
                isLoading={loading}
                loadingText="Setting password..."
              >
                <div className="flex items-center">
                  Set Password
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 