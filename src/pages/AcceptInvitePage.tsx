import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { InvitationToken } from '@/types/team';
import { AlertCircle, CheckCircle } from 'lucide-react';

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

  return (
    <div className="flex justify-center items-center" style={{ minHeight: '80vh' }}>
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <div className="bg-primary-600 text-white p-4 rounded-t-lg">
          <h2 className="text-xl font-bold text-center">Team Invitation</h2>
        </div>
        <div className="p-6 text-center">
          {loading && (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
              <p className="text-gray-600">Processing your invitation...</p>
            </>
          )}
          
          {error && (
            <>
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
                {error}
              </div>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="px-4 py-2"
                >
                  Log In
                </Button>
                <Button 
                  onClick={() => navigate('/app')}
                  className="px-4 py-2"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}
          
          {success && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Invitation Accepted!</h3>
              <p className="text-gray-600 mb-2">You are now a member of the team.</p>
              <p className="text-gray-400 text-sm mb-4">Redirecting to dashboard in 3 seconds...</p>
              <Button 
                onClick={() => navigate('/app')}
                className="px-4 py-2"
              >
                Go to Dashboard Now
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage; 