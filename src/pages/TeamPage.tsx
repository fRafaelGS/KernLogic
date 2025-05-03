import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/EmptyState';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { formatDistanceToNow } from 'date-fns';
import InviteUserModal from '@/components/InviteUserModal';
import BulkInviteModal from '@/components/BulkInviteModal';
import ManageControls from '@/components/ManageControls';
import RoleDescriptionTooltip from '@/components/RoleDescriptionTooltip';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet, History, Search, UserPlus, Users } from 'lucide-react';
import api from '@/services/api';
import { Role } from '@/types/team';
import { exportTeamToCSV, fetchRoles } from '@/services/teamService';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Membership {
  id: string;
  user: number | string; // Just the user ID
  user_email?: string;
  user_name?: string;
  avatar_url?: string;
  role: {
    id: string;
    name: string;
    description?: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  orgid: string; 
  status?: 'active' | 'pending';
  created_at: string;
  updated_at: string;
  invited_at?: string;
  last_login?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  token: string;
  created_at: string;
  expires_at: string;
  organization: {
    id: string;
    name: string;
  };
}

export const TeamPage: React.FC = () => {
  // State
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orgError, setOrgError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Get auth context and navigation
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Create debounced search value for better UX
  const debouncedSearchText = useDebounce(searchText, 300);
  
  // Simplified admin check - direct boolean check
  const isAdmin = Boolean(
    user?.is_staff || 
    user?.role === 'admin'
  );

  // Get organization ID from auth context
  const orgID = user?.organization_id;

  // Enhanced debugging
  useEffect(() => {
    console.log(`[TeamPage] Auth loading: ${authLoading}`);
    console.log(`[TeamPage] User: ${JSON.stringify(user, null, 2)}`);
    
    if (user) {
      console.log(`[TeamPage] organizationId: ${user.organization_id}`);
      console.log(`[TeamPage] role: ${user.role}`);
      console.log(`[TeamPage] isStaff: ${user.is_staff}`);
    } else {
      console.log(`[TeamPage] No user found in auth context`);
    }
  }, [user, authLoading]);

  // Check if we have a valid organization ID
  useEffect(() => {
    // Only check after auth loading is complete
    if (authLoading) {
      console.log('[TeamPage] Auth is still loading, waiting...');
      return;
    }
    
    if (!user) {
      console.error('[TeamPage] No user in auth context');
      setOrgError(true);
      toast.error('Authentication required');
      
      // Redirect to login after a delay
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    if (!orgID) {
      console.error('[TeamPage] No organization ID available in user context');
      console.error('[TeamPage] User object:', JSON.stringify(user, null, 2));
      setOrgError(true);
      
      // Show detailed error message
      toast.error('No organization ID available. Please contact support.');
      
      // Don't redirect yet - let user see the error
    } else {
      setOrgError(false);
      console.log('[TeamPage] Using organization ID:', orgID);
    }
  }, [orgID, navigate, user, authLoading]);

  // Only enable queries if we have an organization ID
  const hasOrgID = Boolean(orgID) && !orgError;

  // Fetch available roles
  const { 
    data: roles = [], 
    isLoading: isRolesLoading, 
    isError: isRolesError 
  } = useQuery({
    queryKey: ['roles', orgID],
    queryFn: () => {
      if (!orgID) {
        console.error('[TeamPage] No organization ID available for fetching roles');
        throw new Error('No organization ID available for fetching roles');
      }
      console.log('[TeamPage] Fetching roles for organization:', orgID);
      return fetchRoles(orgID);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasOrgID, // Only run if we have an org ID
    retry: 1, // Only retry once
  });

  // Fetch team members
  const { 
    data: membersData = { results: [], count: 0 }, 
    isLoading, 
    isError,
    refetch
  } = useQuery({
    queryKey: ['teamMembers', debouncedSearchText, roleFilter, statusFilter, orgID, page, pageSize],
    queryFn: async () => {
      try {
        if (!orgID) {
          console.error('[TeamPage] No organization ID available for fetching memberships');
          throw new Error('No organization ID available for fetching memberships');
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[TeamPage] Fetching memberships with organization ID:', orgID);
        }
        
        // Build query parameters for filtering
        const params = new URLSearchParams();
        if (debouncedSearchText) params.append('search', debouncedSearchText);
        if (roleFilter !== 'all') params.append('role', roleFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        params.append('page', page.toString());
        params.append('page_size', pageSize.toString());
        
        // Make the API request - remove extra slash before ?
        const response = await api.get(`/api/orgs/${orgID}/memberships?${params.toString()}`);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[TeamPage] Fetched memberships:', response.data);
        }
        
        // Return the full data with count - no need to set state here
        return {
          results: Array.isArray(response.data.results) ? response.data.results : [],
          count: response.data.count || 0
        };
      } catch (err) {
        console.error('[TeamPage] Error fetching memberships:', err);
        toast.error('Failed to load team members');
        return { results: [], count: 0 }; // Return empty array on error
      }
    },
    retry: 1,
    enabled: hasOrgID, // Only run the query if we have an organization ID
    placeholderData: (prev) => prev, // Use previous data while new data is loading
  });

  // Ensure members is always an array
  const members = Array.isArray(membersData.results) ? membersData.results : [];

  // Reset to page 1 when search text changes
  useEffect(() => {
    if (searchText !== debouncedSearchText) {
      setPage(1);
    }
  }, [searchText, debouncedSearchText]);

  // Handle page change for pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle CSV export
  const handleExportTeam = async () => {
    try {
      if (!orgID) {
        throw new Error('No organization ID available');
      }
      await exportTeamToCSV(orgID);
      toast.success('Team exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting team:', error);
      toast.error('Failed to export team');
    }
  };

  // Loading state - show while auth is still loading or we're waiting for org ID
  if (authLoading) {
    return <div className="py-10 text-center">Loading authentication details...</div>;
  }
  
  // Error state - when there's no organization ID available
  if (orgError) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="text-red-500 mb-4">Error: No organization ID available</div>
        <p className="text-gray-600 mb-4">
          Your account does not have an associated organization.
        </p>
        {user?.is_staff && (
          <Button onClick={() => navigate('/app')}>
            Return to Dashboard
          </Button>
        )}
      </div>
    );
  }
  
  // Original loading state for team data
  if (isLoading || isRolesLoading) return <div className="py-10 text-center">Loading team data…</div>;
   
  // Original error state for team data
  if (isError || isRolesError) return <div className="py-10 text-center text-red-500">Failed to load team data. Try again later.</div>;

  // Calculate total pages directly from the data
  const totalPages = Math.ceil(membersData.count / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-enterprise-900">Team Management</h1>
          <p className="text-enterprise-600 mt-1">
            Manage team members and permissions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/app/team/history">
            <Button variant="outline" className="flex items-center">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </Link>
          
          {isAdmin && (
            <Button 
              variant="outline"
              onClick={handleExportTeam}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          
          {/* Only show invite buttons to admins */}
          {isAdmin && (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowBulkInviteModal(true)}
                className="flex items-center"
              >
                <Users className="h-4 w-4 mr-2" />
                Bulk Invite
              </Button>
              
              <Button 
                onClick={() => setShowInviteModal(true)}
                data-component="invite-button"
                className="flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs for Active/Pending */}
      <Tabs 
        value={statusFilter} 
        onValueChange={value => {
          setStatusFilter(value);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All Members</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        
        <TabsContent value={statusFilter} className="mt-6">
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="relative w-full sm:w-1/3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name or email"
                className="pl-9 w-full"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 bg-gray-100 text-xs text-gray-600 rounded mb-4">
              <p>Debug: Filters - Search: "{searchText}", Role: {roleFilter}, Status: {statusFilter}</p>
              <p>Organization ID: {orgID || 'Not available'}</p>
              <p>Members Count: {members.length}</p>
              <p>Total Count: {membersData.count}</p>
              <p>Page: {page} of {totalPages}</p>
              <p>Is Array: {Array.isArray(members) ? 'Yes' : 'No'}</p>
              <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
              <p>Has Roles: {roles.length > 0 ? 'Yes' : 'No'}</p>
              <p>Current User: {user?.email || 'Unknown'}</p>
            </div>
          )}

          {/* Empty State */}
          {members.length === 0 && (
            <EmptyState
              title="No team members found"
              description="Try changing your search or filter criteria, or invite someone new."
              buttonText="Invite Member"
              buttonIcon={<UserPlus className="h-4 w-4 mr-2" />}
              onButtonClick={() => isAdmin && setShowInviteModal(true)}
            />
          )}

          {/* Member List */}
          {Array.isArray(members) && members.length > 0 && (
            <>
              <div className="bg-white rounded-md shadow overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-500">
                  <div className="col-span-5">Member</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-3">Last Activity</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                
                <div className="divide-y">
                  {members.map(member => {
                    // Handle both formats - nested user object or flattened properties
                    const email = member.user_email || (member.user && typeof member.user === 'object' ? member.user.email : '');
                    const name = member.user_name || (member.user && typeof member.user === 'object' ? member.user.name : 'User');
                    const avatar = member.avatar_url || (member.user && typeof member.user === 'object' ? member.user.avatar_url : undefined);
                    const status = member.status || 'active';
                    const roleInfo = member.role || { name: 'Unknown', description: '' };
                    
                    return (
                      <div
                        key={member.id}
                        className="grid grid-cols-12 gap-4 p-4 items-center"
                      >
                        {/* Avatar, Name, Email */}
                        <div className="col-span-5 flex items-center space-x-3">
                          <AvatarBadge
                            src={avatar}
                            name={name}
                            status={status === 'active' ? 'online' : 'offline'}
                          />
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-gray-500">{email}</div>
                          </div>
                        </div>

                        {/* Role */}
                        <div className="col-span-2">
                          {status === 'active' ? (
                            <RoleDescriptionTooltip 
                              roleName={roleInfo.name}
                              description={roleInfo.description || ''}
                            />
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs">
                              Pending
                            </span>
                          )}
                        </div>
                        
                        {/* Last Activity */}
                        <div className="col-span-3 text-sm text-gray-500">
                          {status === 'pending'
                            ? `Invited ${formatDistanceToNow(new Date(member.invited_at || new Date()))} ago`
                            : `Last active ${formatDistanceToNow(new Date(member.last_login || member.invited_at || new Date()))} ago`}
                        </div>
                        
                        {/* Member Actions */}
                        <div className="col-span-2 flex justify-end">
                          {/* Member Controls - only for admins */}
                          {isAdmin && (
                            <ManageControls
                              membershipId={member.id}
                              status={status}
                              currentRoleId={roleInfo.id || 0}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, membersData.count)} of {membersData.count} members
                  </div>
                  <Pagination>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePageChange(1)} 
                      disabled={page === 1}
                    >
                      First
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePageChange(page - 1)} 
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="mx-4">
                      Page {page} of {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePageChange(page + 1)} 
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePageChange(totalPages)} 
                      disabled={page === totalPages}
                    >
                      Last
                    </Button>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite User Modal - only shown for admins */}
      {showInviteModal && isAdmin && roles.length > 0 && (
        <InviteUserModal
          show={showInviteModal}
          onHide={() => setShowInviteModal(false)}
          roles={roles}
          onSuccess={() => refetch()}
        />
      )}
      
      {/* Bulk Invite Modal - only shown for admins */}
      {showBulkInviteModal && isAdmin && roles.length > 0 && (
        <BulkInviteModal
          show={showBulkInviteModal}
          onHide={() => setShowBulkInviteModal(false)}
          roles={roles}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default TeamPage;
