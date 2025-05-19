import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/EmptyState';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
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
import { PermissionGuard } from '@/components/common/PermissionGuard';

interface Membership {
  id: string;
  user: number | string | { 
    id: string | number; 
    email?: string; 
    name?: string;
    avatar_url?: string;
  } | null;
  user_email?: string;
  user_name?: string;
  avatar_url?: string;
  role: {
    id?: string | number;
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
  
  // Get auth context and navigation
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Create debounced search value for better UX
  const debouncedSearchText = useDebounce(searchText, 300);
  
  // Permission-based approach
  const { checkPermission } = useAuth();
  
  // Check if user has various permissions
  const canViewTeam = checkPermission('team.view');
  const canInviteUsers = checkPermission('team.invite');
  const canChangeRoles = checkPermission('team.change_role');
  const canRemoveUsers = checkPermission('team.remove');

  // Get organization ID from auth context
  const orgID = user?.organization_id;

  // Check if we have a valid organization ID
  useEffect(() => {
    // Only check after auth loading is complete
    if (authLoading) {
      return;
    }
    
    if (!user) {
      setOrgError(true);
      toast.error('Authentication required');
      
      // Redirect to login after a delay
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    if (!orgID) {
      setOrgError(true);
      
      // Show detailed error message
      toast.error('No organization ID available. Please contact support.');
    } else {
      setOrgError(false);
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
        throw new Error('No organization ID available for fetching roles');
      }
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
          throw new Error('No organization ID available for fetching memberships');
        }
        
        // Build query parameters for filtering
        const params = new URLSearchParams();
        if (debouncedSearchText) params.append('search', debouncedSearchText);
        if (roleFilter !== 'all') params.append('role', roleFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        params.append('page', page.toString());
        params.append('page_size', pageSize.toString());
        
        // Make the API request
        const response = await api.get(`/orgs/${orgID}/memberships?${params.toString()}`);
        
        // Log raw API response in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Team members API response:', response.data);
        }
        
        // Handle different response shapes (array or paginated object)
        const raw = response.data;
        const isArray = Array.isArray(raw);
        
        return {
          results: isArray ? raw
                 : Array.isArray(raw.results) ? raw.results
                 : [],
          count: isArray ? raw.length
                 : raw.count ?? 0
        };
      } catch (err) {
        toast.error('Failed to load team members');
        return { results: [], count: 0 }; // Return empty array on error
      }
    },
    retry: 1,
    enabled: hasOrgID, // Only run the query if we have an organization ID
    placeholderData: (prev) => prev, // Use previous data while new data is loading
  });

  // Handle avatar update for a team member
  const handleAvatarUpdate = (memberId: string, newAvatarUrl: string) => {
    // Skip local state updates and just refetch data
    refetch();
    toast.success('Avatar updated successfully');
  };

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
      toast.error('Failed to export team');
    }
  };

  // Loading state - show while auth is still loading or we're waiting for org ID
  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state - when there's no organization ID available
  if (orgError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Organization Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
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
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Original loading state for team data
  if (isLoading || isRolesLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
   
  // Original error state for team data
  if (isError || isRolesError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Data Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              <p className="text-red-500">Failed to load team data. Try again later.</p>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total pages directly from the data
  const totalPages = Math.ceil(membersData.count / pageSize);

  const formatLastActivity = (member: Membership) => {
    try {
      // Log to help diagnose what data we're getting from API
      if (process.env.NODE_ENV === 'development') {
        console.log('Member timestamps:', {
          id: member.id,
          last_login: member.last_login,
          updated_at: member.updated_at,
          created_at: member.created_at,
          status: member.status
        });
      }

      if (member.status === 'pending') {
        return member.invited_at 
          ? `Invited ${formatDistanceToNow(new Date(member.invited_at))} ago`
          : 'Recently invited';
      } else {
        // Use the most recent timestamp from these fields
        const possibleDates: {field: string, date: Date}[] = [];
        
        // Add timestamps to array if they exist and are valid dates
        if (member.last_login) {
          try {
            const date = new Date(member.last_login);
            if (!isNaN(date.getTime())) possibleDates.push({ field: 'last_login', date });
          } catch (e) {}
        }
        
        if (member.updated_at) {
          try {
            const date = new Date(member.updated_at);
            if (!isNaN(date.getTime())) possibleDates.push({ field: 'updated_at', date });
          } catch (e) {}
        }
        
        if (member.created_at) {
          try {
            const date = new Date(member.created_at);
            if (!isNaN(date.getTime())) possibleDates.push({ field: 'created_at', date });
          } catch (e) {}
        }
        
        if (possibleDates.length === 0) {
          return 'Active recently';
        }
        
        // Sort dates in descending order (newest first)
        possibleDates.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        // Use the most recent date
        const mostRecent = possibleDates[0];
        return `Last active ${formatDistanceToNow(mostRecent.date)} ago`;
      }
    } catch (e) {
      console.error('Error formatting last activity:', e);
      return 'Activity status unknown';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 w-full max-w-full flex-grow" style={{ minWidth: '100%' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold text-enterprise-900">Team Management</h1>
          <p className="text-enterprise-600 mt-1">
            Manage team members and permissions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGuard permission="team.view">
            <Link to="/app/team/history">
              <Button variant="outline" className="flex items-center" size="sm">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
          </PermissionGuard>
          
          <PermissionGuard permission="team.view">
            <Button 
              variant="outline"
              onClick={handleExportTeam}
              className="flex items-center"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </PermissionGuard>
          
          <PermissionGuard permission="team.invite">
            <Button 
              variant="outline"
              onClick={() => setShowBulkInviteModal(true)}
              className="flex items-center"
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Invite
            </Button>
            
            <Button 
              onClick={() => setShowInviteModal(true)}
              data-component="invite-button"
              className="flex items-center"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <Card className="w-full">
        <CardContent className="p-0">
          <Tabs 
            value={statusFilter} 
            onValueChange={value => {
              setStatusFilter(value);
              setPage(1);
            }}
            className="w-full"
          >
            <div className="flex items-center justify-between border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="all" className="data-[state=active]:bg-primary/10">All Members</TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-primary/10">Active</TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-primary/10">Pending</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={statusFilter} className="p-0 mt-0">
              <div className="flex flex-wrap gap-4 items-center p-4 border-b bg-muted/30">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by name or email"
                    className="pl-9 w-full"
                    aria-label="Search team members"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Select 
                    value={roleFilter} 
                    onValueChange={(value) => {
                      setRoleFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by role">
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
              </div>

              {/* Empty State */}
              {membersData.results.length === 0 && (
                <div className="p-8">
                  <EmptyState
                    title="No team members found"
                    description="Try changing your search or filter criteria, or invite someone new."
                    buttonText={canInviteUsers ? "Invite Member" : undefined}
                    buttonIcon={canInviteUsers ? <UserPlus className="h-4 w-4 mr-2" /> : undefined}
                    onButtonClick={() => canInviteUsers && setShowInviteModal(true)}
                  />
                </div>
              )}

              {/* Member List */}
              {Array.isArray(membersData.results) && membersData.results.length > 0 && (
                <div className="overflow-x-auto w-full">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[45%]">Member</TableHead>
                        <TableHead className="w-[15%]">Role</TableHead>
                        <TableHead className="w-[30%]">Last Activity</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membersData.results.map(member => {
                        // Handle both formats - nested user object or flattened properties
                        const email = member.user_email || (member.user && typeof member.user === 'object' ? member.user.email : '');
                        const name = member.user_name || (member.user && typeof member.user === 'object' ? member.user.name : 'User');
                        const avatar = member.avatar_url || (member.user && typeof member.user === 'object' ? member.user.avatar_url : undefined);
                        const status = member.status || 'active';
                        const roleInfo = member.role || { name: 'Unknown', description: '' };
                        
                        // Safely extract userId from different possible formats
                        let userId = '';
                        if (member.user) {
                          if (typeof member.user === 'string') {
                            userId = member.user;
                          } else if (typeof member.user === 'number') {
                            userId = member.user.toString();
                          } else if (typeof member.user === 'object' && 'id' in member.user) {
                            userId = String(member.user.id);
                          }
                        }
                        
                        // Safely get roleId
                        const roleId = roleInfo.id !== undefined ? String(roleInfo.id) : '';
                        
                        return (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <Avatar 
                                    name={name}
                                    avatarUrl={avatar} 
                                    userId={userId}
                                    showUploadButton={String(user?.id) === String(userId)}
                                    onAvatarUpdated={(newUrl) => handleAvatarUpdate(member.id, newUrl)}
                                  />
                                  {status === 'active' ? (
                                    <span className="absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-white h-2 w-2" />
                                  ) : (
                                    <span className="absolute bottom-0 right-0 rounded-full bg-gray-400 border-2 border-white h-2 w-2" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{name}</div>
                                  <div className="text-sm text-gray-500">{email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {status === 'pending'
                                ? member.invited_at 
                                  ? `Invited ${formatDistanceToNow(new Date(member.invited_at))} ago`
                                  : 'Recently invited'
                                : member.last_login 
                                  ? `Last active ${formatDistanceToNow(new Date(member.last_login))} ago`
                                  : 'Active recently'}
                            </TableCell>
                            <TableCell className="text-right">
                              <PermissionGuard permission="team.change_role">
                                <ManageControls
                                  membershipId={member.id}
                                  status={status}
                                  currentRoleId={roleId}
                                  roleName={roleInfo.name}
                                />
                              </PermissionGuard>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, membersData.count)} of {membersData.count} members
                  </div>
                  <div className="flex items-center space-x-2">
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
                    <span className="mx-2">
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
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Invite User Modal - only shown for users with invite permission */}
      {showInviteModal && canInviteUsers && roles.length > 0 && (
        <InviteUserModal
          show={showInviteModal}
          onHide={() => setShowInviteModal(false)}
          roles={roles}
          onSuccess={() => refetch()}
        />
      )}
      
      {/* Bulk Invite Modal - only shown for users with invite permission */}
      {showBulkInviteModal && canInviteUsers && roles.length > 0 && (
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
