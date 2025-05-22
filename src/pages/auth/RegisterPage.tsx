import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BeakerIcon, User, Mail, LockKeyhole, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ROUTES } from '@/config/routes';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || password.length < 6) {
        toast.error("Please fill in all fields (password must be 6+ characters).");
        return;
    }
    
    try {
      await register(email, password, name);
    } catch (err) {
      console.error('Registration error (already handled by context):', err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:block relative flex-1">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500 to-primary-700">
          <div className="absolute inset-0 bg-enterprise-900 opacity-20 mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Join thousands of businesses</h2>
            <p className="text-primary-100">
              Start managing your product data efficiently with KernLogic's powerful platform
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
            <h2 className="mt-6 text-3xl font-bold text-enterprise-900">Create your account</h2>
            <p className="mt-2 text-sm text-enterprise-600">
              Or{' '}
              <Link to={ROUTES.AUTH.LOGIN} className="font-medium text-primary-600 hover:text-primary-500">
                sign in to your existing account
              </Link>
            </p>
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
                  className="block w-full pl-10 border border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500"
                  placeholder="you@example.com"
                />
              </div>
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 border border-enterprise-200 focus-visible:ring-primary-500 focus-visible:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
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
                loadingText="Creating account..."
              >
                <div className="flex items-center">
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>

            <div className="text-sm text-center text-enterprise-500">
              By creating an account, you agree to our{' '}
              <Link to={ROUTES.AUTH.TERMS} className="text-primary-600 hover:text-primary-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to={ROUTES.AUTH.PRIVACY} className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 