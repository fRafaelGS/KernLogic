import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { formatDistanceToNow } from 'date-fns';
import InviteUserModal from '@/components/InviteUserModal';
import ManageControls from '@/components/ManageControls';
import RoleDescriptionTooltip from '@/components/RoleDescriptionTooltip';
import { Link } from 'react-router-dom';
import { History, UserPlus } from 'lucide-react';
import api from '@/services/api';
import { Role } from '@/types/team';

interface Membership {
  id: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  role: {
    id: string;
    name: string;
  };
  organization: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
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
  const [showModal, setShowModal] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const { orgId } = useParams<{ orgId: string }>();
  
  // Get authentication context
  const { user } = useAuth();
  
  // Simplified admin check - direct boolean check
  const isAdmin = Boolean(
    user?.is_staff || 
    user?.role === 'admin'
  );

  // Use the non-null assertion as requested
  const orgID = orgId ?? user?.organization_id ?? '1';

  // Fetch team members
  const { 
    data: membersData = [], 
    isLoading, 
    isError,
    refetch
  } = useQuery({
    queryKey: ['teamMembers', searchText, roleFilter, statusFilter, orgID],
    queryFn: async () => {
      try {
        console.log('Fetching memberships from API');
        
        // Build query parameters for filtering
        const params = new URLSearchParams();
        if (searchText) params.append('search', searchText);
        if (roleFilter !== 'all') params.append('role', roleFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        
        // Make the API request
        const response = await api.get(`/api/orgs/${orgID}/memberships/?${params.toString()}`);
        console.log('Fetched memberships:', response.data);
        
        // Ensure we're returning an array
        return Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        console.error('Error fetching memberships:', err);
        toast.error('Failed to load team members');
        return []; // Return empty array on error
      }
    },
    retry: 1,
    enabled: !!orgID // Only run the query if we have an organization ID
  });

  // Ensure members is always an array
  const members = Array.isArray(membersData) ? membersData : [];

  // For search, implement a debounce function to prevent too many API calls
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
  };

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get(`/api/orgs/${orgID}/roles/`);
        console.log('Fetched roles:', response.data);
        // Ensure roles is always an array
        setRoles(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching roles:', err);
        toast.error('Failed to load available roles');
      }
    };

    if (orgID) {
      fetchRoles();
    }
  }, [orgID]);

  // 2. Loading or error states
  if (isLoading) return <div className="py-10 text-center">Loading team…</div>;
  if (isError) return <div className="py-10 text-center text-red-500">Failed to load team. Try again later.</div>;

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
          
          {/* Only show invite button to admins */}
          {isAdmin && (
            <Button 
              onClick={() => setShowModal(true)}
              data-component="invite-button"
              className="flex items-center"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          value={searchText}
          onChange={handleSearchChange}
          placeholder="Search by name or email"
          className="w-full sm:w-1/3"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Editor">Editor</SelectItem>
            <SelectItem value="Viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-gray-100 text-xs text-gray-600 rounded">
          <p>Debug: Filters - Search: "{searchText}", Role: {roleFilter}, Status: {statusFilter}</p>
          <p>Organization ID: {orgID}</p>
          <p>Members Count: {members.length}</p>
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
          onButtonClick={() => isAdmin && setShowModal(true)}
        />
      )}

      {/* Member List */}
      {Array.isArray(members) && members.length > 0 && (
        <div className="space-y-4">
          {members.map(member => {
            // Safely access user properties with fallbacks
            const userData = member.user || {};
            const name = userData.name || 'Unknown User';
            const email = userData.email || 'No email';
            const avatar = userData.avatar_url;
            const status = member.status || 'active';
            const roleInfo = member.role || { name: 'Unknown', description: '' };
            
            return (
              <div
                key={member.id}
                className="flex items-center justify-between bg-white rounded shadow p-4"
              >
                {/* Avatar, Name, Email */}
                <div className="flex items-center space-x-3">
                  <AvatarBadge
                    src={avatar}
                    name={name}
                  />
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-gray-500">{email}</div>
                    <div className="text-xs text-gray-400">
                      {status === 'pending'
                        ? `Invited ${formatDistanceToNow(new Date(member.invited_at || new Date()))} ago`
                        : `Last active ${formatDistanceToNow(new Date(member.last_login || member.invited_at || new Date()))} ago`}
                    </div>
                  </div>
                </div>

                {/* Member Actions */}
                <div className="flex items-center space-x-3">
                  {/* Role Badge with Tooltip */}
                  {status === 'active' && (
                    <RoleDescriptionTooltip 
                      roleName={roleInfo.name}
                      description={roleInfo.description}
                    />
                  )}
                  
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
      )}

      {/* Invite User Modal - only shown for admins */}
      {showModal && isAdmin && roles.length > 0 && (
        <InviteUserModal
          show={showModal}
          onHide={() => setShowModal(false)}
          roles={roles}
        />
      )}
    </div>
  );
};

export default TeamPage;
