import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { BeakerIcon, LockKeyhole, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const { login, error: authError, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state, or default to /app
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.APP.ROOT;

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    let isValid = true;

    if (!email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
      // Redirect to the page they tried to visit or default to /app
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 lg:flex-none lg:max-w-md xl:max-w-lg">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
            <div className="flex items-center">
              <BeakerIcon className="h-7 w-7 text-primary-600 mr-2" />
              <h1 className="text-2xl font-bold text-enterprise-900">KernLogic</h1>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-enterprise-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-enterprise-600">
              Or{' '}
              <Link to={ROUTES.AUTH.REGISTER} className="font-medium text-primary-600 hover:text-primary-500">
                create a new account
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormErrors({ ...formErrors, email: undefined });
                  }}
                  className={`block w-full pl-10 border ${
                    formErrors.email || (authError?.field === 'email' && authError)
                      ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500'
                      : 'border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {(formErrors.email || (authError?.field === 'email' && authError)) && (
                <p className="mt-2 text-sm text-danger-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.email || (authError?.field === 'email' ? authError.message : '')}
                </p>
              )}
            </div>

            <div>
              <Label 
                htmlFor="password" 
                className="block text-sm font-medium text-enterprise-700"
              >
                Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-enterprise-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors({ ...formErrors, password: undefined });
                  }}
                  className={`block w-full pl-10 border ${
                    formErrors.password || (authError?.field === 'password' && authError)
                      ? 'border-danger-300 focus-visible:ring-danger-500 focus-visible:border-danger-500'
                      : 'border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {(formErrors.password || (authError?.field === 'password' && authError)) && (
                <p className="mt-2 text-sm text-danger-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.password || (authError?.field === 'password' ? authError.message : '')}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-enterprise-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-enterprise-600">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to={ROUTES.AUTH.FORGOT_PASSWORD} className="font-medium text-primary-600 hover:text-primary-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            {authError && !authError.field && (
              <div className="rounded-md bg-danger-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-danger-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-danger-700">{authError.message}</p>
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
                loadingText="Signing in..."
              >
                <div className="flex items-center">
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-enterprise-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-enterprise-500">
                  New to KernLogic?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link to={ROUTES.AUTH.REGISTER} className={cn(buttonVariants({ variant: "outline", fullWidth: true }))}>
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full object-cover bg-primary-700 flex items-center justify-center">
          <div className="max-w-md p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Welcome to KernLogic</h2>
            <p className="mb-4">
              The enterprise-grade Product Information Management (PIM) platform designed to help you manage your product data efficiently.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="h-5 w-5 mr-2 text-primary-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Centralized product data management
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 mr-2 text-primary-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Automated data quality controls
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 mr-2 text-primary-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Enterprise-grade security and compliance
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 