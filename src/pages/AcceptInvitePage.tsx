import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { InvitationToken } from '@/types/team';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AcceptInvitePage: React.FC = () => {
  const { membershipId, token } = useParams<{ membershipId: string; token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [membership, setMembership] = useState<any>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMembership = async () => {
      try {
        setLoading(true);
        
        // Fetch membership details if possible to check if this is a valid invitation
        if (membershipId) {
          try {
            const response = await api.get(`/api/orgs/memberships/${membershipId}/check/`, { 
              // Allow unauthenticated check
              validateStatus: status => status < 500
            });
            
            if (response.status === 200) {
              setMembership(response.data);
              setInvitedEmail(response.data.user?.email);
            }
          } catch (err) {
            console.error('Error checking membership:', err);
            // Continue with the flow even if we can't check the membership
          }
        }
        
        // First, check if the user is logged in
        if (!isAuthenticated) {
          // Store the invitation details to process after login
          const pendingInvitation: InvitationToken = {
            membershipId: membershipId || '',
            token: token || ''
          };
          
          sessionStorage.setItem('pendingInvitation', JSON.stringify(pendingInvitation));
          
          // If we know the invited email and it doesn't match any existing user
          // redirect to registration instead of login
          if (invitedEmail && membership?.is_new_user) {
            navigate(`/register/${membership.organization?.id}?token=${token}&email=${invitedEmail}`);
            return;
          }
          
          // Redirect to login
          navigate('/login?redirect=invitation');
          return;
        }
        
        // Check if the logged-in user is the intended recipient
        if (invitedEmail && user?.email !== invitedEmail) {
          setError(`This invitation was sent to ${invitedEmail}, but you're logged in as ${user?.email}. Please log out and log in with the correct account.`);
          setLoading(false);
          return;
        }
        
        // If user exists but doesn't have a password set (user was created when invited)
        if (membership?.user_exists && membership?.needs_password && invitedEmail) {
          console.log("User exists but needs to set a password");
          // Redirect to set-password page with the necessary parameters
          navigate(`/set-password/${membership.organization?.id}?token=${token}&email=${encodeURIComponent(invitedEmail)}`);
          return;
        }
        
        // Call the API to accept the invitation
        await api.post(`/api/orgs/memberships/${membershipId}/accept/`, {
          token: token
        });
        
        setSuccess(true);
        setError(null);
        
        // After 3 seconds, redirect to dashboard
        setTimeout(() => {
          navigate('/app');
        }, 3000);
      } catch (err: any) {
        console.error('Error accepting invitation:', err);
        setError(err.response?.data?.detail || 'An error occurred while accepting the invitation');
      } finally {
        setLoading(false);
      }
    };

    if (membershipId && token) {
      checkMembership();
    }
  }, [membershipId, token, isAuthenticated, navigate, user, invitedEmail, membership]);

  const handleAutoAccept = async () => {
    try {
      setLoading(true);
      
      // Automatically accept the invitation if already logged in
      await api.post(`/api/orgs/memberships/${membershipId}/accept/`, {
        token: membershipId
      });
      
      toast.success('Invitation accepted!');
      navigate('/app');
    } catch (err: any) {
      console.error('Error auto-accepting invitation:', err);
      setError(err.response?.data?.detail || 'Failed to accept invitation');
      setLoading(false);
    }
  };

  const handleRedirect = () => {
    // If the user needs to set a password (new user), redirect to the set password page
    if (membership?.is_new_user) {
      navigate(`/set-password/${membership.organization?.id}?token=${membershipId}&email=${membership.user?.email}`);
    } else {
      // Otherwise, redirect to login
      navigate(`/login?invitation=${membershipId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <h2 className="mt-4 text-xl font-medium text-gray-900">Checking invitation...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-red-100 p-3 w-fit">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl mt-3">Invalid Invitation</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-green-100 p-3 w-fit">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl mt-3">Already Accepted</CardTitle>
            <CardDescription>This invitation has already been accepted</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/login')}>Log In</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">You've Been Invited</CardTitle>
          <CardDescription>
            {membership?.organization?.name || 'An organization'} has invited you to join their team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700"><strong>Email:</strong> {membership?.user?.email}</p>
              {membership?.role && (
                <p className="text-sm text-gray-700 mt-2"><strong>Role:</strong> {membership.role}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button onClick={handleRedirect}>
            {membership?.is_new_user ? 'Set Up Account' : 'Accept Invitation'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AcceptInvitePage; 