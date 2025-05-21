import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/domains/core/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/domains/core/components/ui/tabs';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/domains/core/components/ui/input';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/domains/core/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/domains/core/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/domains/core/components/ui/table";
import { Skeleton } from '@/domains/core/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import InviteUserModal from '@/domains/accounts/components/InviteUserModal';
import BulkInviteModal from '@/domains/accounts/components/BulkInviteModal';
import ManageControls from '@/domains/core/components/ManageControls';
import RoleDescriptionTooltip from '@/domains/accounts/components/RoleDescriptionTooltip';
import { Link } from 'react-router-dom';
import { History, Search, UserPlus, Users } from 'lucide-react';
import { fetchRoles, fetchTeamMembers, fetchUserProductActions } from '@/services/teamService';
import { useDebounce } from '@/hooks/useDebounce';
import { PermissionGuard } from '@/components/common/PermissionGuard';

// Import the configuration
import { config as appConfig } from '@/config/config';

// Create a local reference to avoid name conflicts
const config = appConfig;

// Table column interface - ensure it matches the actual config format
interface TableColumn {
  name: string;
  width: string;
  align?: string;
}

// Tab interface
interface TabItem {
  value: string;
  label: string;
}

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

// Interface for the product activity data from the Activity model
interface ProductActivity {
  id: number;
  entity: string;
  entity_id: string | number;
  action: string;
  message: string;
  created_at?: string;
  timestamp?: string; // Some endpoints return created_at as timestamp
  user?: number;
  user_id?: number;
  user_name?: string;
  organization?: string | number;
  type?: string; // Some serializers rename action as type
  details?: string; // Some serializers rename message as details
}

export const TeamPage: React.FC = () => {
  // State
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.team.pagination.defaultPageSize);
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
    staleTime: config.team.staleTimes.roles,
    enabled: hasOrgID,
    retry: 1,
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
      if (!orgID) {
        throw new Error('No organization ID available for fetching memberships');
      }
      
      return fetchTeamMembers(orgID, {
        search: debouncedSearchText,
        role: roleFilter,
        status: statusFilter,
        page,
        page_size: pageSize
      });
    },
    retry: 1,
    enabled: hasOrgID,
    placeholderData: (prev) => prev,
  });

  // Fetch last action for each user
  const userIds = useMemo(() => 
    membersData.results
      .map((member: Membership) => {
        // Extract user ID from different possible formats
        if (typeof member.user === 'string') return member.user;
        if (typeof member.user === 'number') return member.user.toString();
        if (member.user && typeof member.user === 'object' && 'id' in member.user) 
          return member.user.id.toString();
        return '';
      })
      .filter(Boolean), 
    [membersData.results]
  );

  // Fetch last product actions for all users
  const { data: userProductActions = {}, isLoading: isLoadingActions } = useQuery({
    queryKey: ['userLastProductActions', userIds, orgID],
    queryFn: async () => {
      if (!orgID || userIds.length === 0) return {};
      return fetchUserProductActions(orgID, userIds);
    },
    enabled: userIds.length > 0 && !!orgID,
    staleTime: config.team.staleTimes.activity,
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

  const renderProductActionDescription = (activity: ProductActivity | null) => {
    if (!activity) return 'No action recently';
    
    // Activity might come from different serializers with different field names
    const actionType = activity.type || activity.action;
    const message = activity.details || activity.message;
    
    // Format the message based on the data we have
    if (message) {
      return message;
    } else if (actionType && activity.entity) {
      return `${actionType} ${activity.entity} ${activity.entity_id}`;
    } else {
      return 'Unknown action';
    }
  };

  // Format the date of the last action in a user-friendly way
  const formatActionDate = (activity: ProductActivity | null) => {
    if (!activity) return '';
    
    // Handle both created_at and timestamp fields
    const dateString = activity.timestamp || activity.created_at;
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // If less than 24 hours ago, show "X hours ago"
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        // Otherwise show the relative time
        return formatDistanceToNow(date) + ' ago';
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 w-full max-w-full flex-grow" style={{ minWidth: '100%' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold text-enterprise-900">{config.team.display.pageTitle}</h1>
          <p className="text-enterprise-600 mt-1">
            {config.team.display.pageDescription}
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
                {config.team.display.tabs.map((tab: TabItem) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary/10">
                    {tab.label}
                  </TabsTrigger>
                ))}
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
                    title={config.team.display.emptyState.title}
                    description={config.team.display.emptyState.description}
                    buttonText={canInviteUsers ? "Invite Member" : ''}
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
                        {config.team.display.tableColumns.map((column, index) => (
                          <TableHead 
                            key={index} 
                            className={`w-[${column.width}]${column.align ? ` text-${column.align}` : ''}`}
                          >
                            {column.name}
                          </TableHead>
                        ))}
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
                        
                        // Get the last action for this user
                        const lastProductAction = userId && userProductActions ? userProductActions[userId] : null;
                        
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
                              {lastProductAction ? (
                                <div>
                                  <div className="font-medium">{renderProductActionDescription(lastProductAction)}</div>
                                  <div className="text-xs text-gray-400">
                                    {formatActionDate(lastProductAction)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400">No action recently</div>
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
