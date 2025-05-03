import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BeakerIcon, User, Mail, LockKeyhole, ArrowRight, AlertCircle, Building } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import api from '@/services/api';
import axios from 'axios';

export default function OrganizationRegisterPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState(emailFromUrl || '');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { register, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  // Fetch organization name
  useEffect(() => {
    const fetchOrgDetails = async () => {
      try {
        if (orgId) {
          setIsLoading(true);
          // For development purposes using a mock call if needed
          if (process.env.NODE_ENV === 'development' && !orgId) {
            setOrgName('Demo Organization');
            setIsLoading(false);
            return;
          }

          const response = await api.get(`/api/orgs/${orgId}/`);
          if (response.data && response.data.name) {
            setOrgName(response.data.name);
            
            // If we have an email from the URL, check if this user already exists
            if (emailFromUrl) {
              try {
                // Make a request to check if user exists but needs password
                const checkResponse = await api.post('/api/check-user/', { 
                  email: emailFromUrl,
                  organization_id: orgId
                });
                
                if (checkResponse.data.exists && checkResponse.data.needs_password) {
                  // User exists but needs to set password - redirect
                  console.log("User exists but needs password, redirecting to set-password page");
                  navigate(`/set-password/${orgId}?token=${token}&email=${encodeURIComponent(emailFromUrl)}`);
                  return;
                }
              } catch (checkError) {
                console.error("Error checking user existence:", checkError);
                // Continue with normal registration flow
              }
            }
          } else {
            setError('Could not fetch organization details.');
          }
        } else {
          setError('No organization specified.');
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Could not load organization details. The invitation may be invalid.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgDetails();
  }, [orgId, emailFromUrl, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name || !email || !password || password.length < 6) {
        toast.error("Please fill in all fields (password must be 6+ characters).");
        return;
    }
    
    if (!orgId || !token) {
        toast.error("Invalid invitation link. Missing organization ID or token.");
        return;
    }
    
    try {
      console.log("Submitting registration form with data:", {
        email,
        password: "********",
        name,
        orgId,
        token: token.substring(0, 5) + "..." // Only log part of the token for security
      });
      
      // Pass organization ID and token to register function
      await register(email, password, name, orgId, token);
      // If successful, navigate to app or success page
      toast.success(`Welcome to ${orgName}! Your account has been created.`);
    } catch (err) {
      console.error('Registration error:', err);
      // Check for specific error messages
      if (axios.isAxiosError(err) && err.response) {
        console.error('Registration error data:', err.response.data);
      }
      // Auth context should already show the error toast
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-enterprise-600">Loading organization details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-enterprise-900 mb-2">Invitation Error</h2>
            <p className="mb-4 text-enterprise-600">{error}</p>
            <Button onClick={() => navigate('/login')} variant="primary">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:block relative flex-1">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500 to-primary-700">
          <div className="absolute inset-0 bg-enterprise-900 opacity-20 mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Join {orgName}</h2>
            <p className="text-primary-100">
              Create your account to start collaborating with your team.
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
            <h2 className="mt-6 text-3xl font-bold text-enterprise-900">Join {orgName}</h2>
            <p className="mt-2 text-sm text-enterprise-600">
              Create your account to accept the invitation.
            </p>
            <div className="mt-4 p-3 bg-primary-50 border border-primary-100 rounded-md">
              <div className="flex items-center">
                <Building className="h-5 w-5 text-primary-500 mr-2" />
                <span className="text-sm text-primary-600">You've been invited to join <strong>{orgName}</strong></span>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label 
                htmlFor="name" 
                className="block text-sm font-medium text-enterprise-700"
              >
                Full Name
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-enterprise-400" />
                </div>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 border border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <Label 
                htmlFor="email" 
                className="block text-sm font-medium text-enterprise-700"
              >
                Email address
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-enterprise-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!emailFromUrl}
                  className={`block w-full pl-10 border border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500 ${emailFromUrl ? 'bg-gray-100' : ''}`}
                  placeholder="you@example.com"
                />
                {emailFromUrl && (
                  <p className="mt-1 text-xs text-enterprise-500">Email address from your invitation</p>
                )}
              </div>
            </div>

            <div>
              <Label 
                htmlFor="password" 
                className="block text-sm font-medium text-enterprise-700"
              >
                Create Password
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

            {(authError || error) && (
              <div className="rounded-md bg-danger-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-danger-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-danger-700">{authError?.message || error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth={true}
                isLoading={authLoading}
                loadingText="Creating account..."
              >
                <div className="flex items-center">
                  Join Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>

            <div className="text-sm text-center text-enterprise-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </div>
            
            <div className="text-xs text-center text-enterprise-400 mt-4">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 