import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { InvitationToken } from '@/types/team';

const AcceptInvitePage: React.FC = () => {
  const { membershipId, token } = useParams<{ membershipId: string; token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const acceptInvitation = async () => {
      try {
        setLoading(true);
        
        // First, check if the user is logged in
        if (!isAuthenticated) {
          // Store the invitation details to process after login
          const pendingInvitation: InvitationToken = {
            membershipId: membershipId || '',
            token: token || ''
          };
          
          sessionStorage.setItem('pendingInvitation', JSON.stringify(pendingInvitation));
          
          // Redirect to login
          navigate('/login?redirect=invitation');
          return;
        }
        
        // Call the API to accept the invitation
        await api.post(`/api/orgs/${membershipId}/memberships/${membershipId}/accept/`);
        
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

    if (membershipId && token && isAuthenticated) {
      acceptInvitation();
    }
  }, [membershipId, token, isAuthenticated, navigate, user]);

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
              <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
                {error}
              </div>
              <button 
                onClick={() => navigate('/app')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Go to Dashboard
              </button>
            </>
          )}
          
          {success && (
            <>
              <div className="mb-4 text-green-500 text-5xl">✓</div>
              <h3 className="text-xl font-semibold mb-2">Invitation Accepted!</h3>
              <p className="text-gray-600 mb-2">You are now a member of the team.</p>
              <p className="text-gray-400 text-sm mb-4">Redirecting to dashboard in 3 seconds...</p>
              <button 
                onClick={() => navigate('/app')}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Go to Dashboard Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage; 