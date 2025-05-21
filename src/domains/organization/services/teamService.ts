import axiosInstance from '@/domains/core/lib/axiosInstance';
import { Activity } from '@/domains/dashboard/services/dashboardService';
import { API_ENDPOINTS } from '@/config/config';
import { Role } from '@/domains/organization/types/team';

// Types for team members
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface TeamMember {
  id: number;
  user: User;
  org_id: string;
  role: Role;
  status: 'pending' | 'active';
  invited_at: string;
  last_login?: string;
}

export interface AuditLogEntry {
  id: number;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  org_id: string;
  action: 'invite' | 'role_change' | 'remove';
  target_type: string;
  target_id: string | number;
  timestamp: string;
  details: Record<string, any>;
}

// Manually define missing team endpoints until API_ENDPOINTS type is updated
const TEAM_ENDPOINTS = {
  activity: API_ENDPOINTS.team.activity,
  history: API_ENDPOINTS.team.history
};

// Utility function to log in development only
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

/**
 * Fetches all available roles for an organization
 * @param orgId Organization ID
 * @returns List of roles
 */
export const fetchRoles = async (orgId: string): Promise<Role[]> => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.orgs.roles(orgId));
    return response.data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

/**
 * Fetches last product action for a user
 * @param userId User ID
 * @returns Last product action or null
 */
export const fetchLastUserProductAction = async (userId: string): Promise<Activity | null> => {
  try {
    const response = await axiosInstance.get(`${TEAM_ENDPOINTS.activity}?user=${userId}&limit=1`);
    const activities = response.data || [];
    return activities.length > 0 ? activities[0] : null;
  } catch (error) {
    console.error('Error fetching user product action:', error);
    return null;
  }
};

/**
 * Fetches team members for an organization
 * @param orgId Organization ID
 * @param params Query parameters for filtering and pagination
 * @returns List of team members with pagination info
 */
export const fetchTeamMembers = async (orgId: string, params: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) => {
  try {
    if (!orgId) {
      throw new Error('No organization ID available for fetching memberships');
    }
    
    // Build query parameters for filtering
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.role && params.role !== 'all') queryParams.append('role', params.role);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());
    
    // Make the API request
    const response = await axiosInstance.get(`${API_ENDPOINTS.orgs.memberships(orgId)}?${queryParams.toString()}`);
    
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
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
};

/**
 * Fetches all activities for the organization to determine last actions
 * @param orgId Organization ID
 * @param userIds List of user IDs to filter activities
 * @returns Map of user IDs to their last activity
 */
export const fetchUserProductActions = async (orgId: string, userIds: string[]) => {
  try {
    if (userIds.length === 0) return {};
    
    // Fetch all activities for the organization
    const response = await axiosInstance.get(`${TEAM_ENDPOINTS.activity}?limit=100`);
    const allActivities = response.data || [];
    
    if (!Array.isArray(allActivities) || allActivities.length === 0) {
      return {};
    }
    
    // Create a map to store the most recent activity for each user
    const actionsMap: Record<string, any> = {};
    
    // Initialize all userIds with null (for users with no actions)
    userIds.forEach((userId: string) => {
      actionsMap[userId] = null;
    });
    
    // Group activities by user
    allActivities.forEach(activity => {
      const activityUserId = activity.user?.toString() || 
                          activity.user_id?.toString();
      
      // Skip if we can't determine the user or it's not in our list
      if (!activityUserId || !userIds.includes(activityUserId)) {
        return;
      }
      
      // If we don't have an activity for this user yet or this one is more recent
      if (!actionsMap[activityUserId] || (
          (activity.created_at && actionsMap[activityUserId]?.created_at && 
          new Date(activity.created_at) > new Date(actionsMap[activityUserId].created_at)) ||
          (activity.timestamp && actionsMap[activityUserId]?.timestamp && 
          new Date(activity.timestamp) > new Date(actionsMap[activityUserId].timestamp))
      )) {
        actionsMap[activityUserId] = activity;
      }
    });
    
    return actionsMap;
  } catch (error) {
    console.error('Error fetching user product actions:', error);
    return {};
  }
};

/**
 * Invite a new team member to the organization
 */
export const inviteMember = async (
  email: string, 
  roleId: number, 
  orgId?: string | number
): Promise<TeamMember> => {
  // Validate that we have an organization ID
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    devLog(`Inviting member to organization: ${orgId}`, {
      email,
      role_id: roleId,
      endpoint: `/api/orgs/${orgId}/memberships/`
    });
    
    const response = await axiosInstance.post(`/api/orgs/${String(orgId)}/memberships/`, {
      email,
      role_id: roleId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error inviting member:', error);
    throw error;
  }
};

/**
 * Bulk invite multiple team members to the organization
 */
export const bulkInviteMembers = async (
  invites: { email: string; role_id: number }[], 
  orgId?: string | number
): Promise<TeamMember[]> => {
  // Validate that we have an organization ID
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    devLog(`Bulk inviting members to organization: ${orgId}`, {
      inviteCount: invites.length,
      endpoint: `/api/orgs/${orgId}/memberships/bulk/`
    });

    const response = await axiosInstance.post(`/api/orgs/${String(orgId)}/memberships/bulk/`, {
      invites
    });
    
    return response.data;
  } catch (error) {
    console.error('Error bulk inviting members:', error);
    throw error;
  }
};

/**
 * Export team members to CSV
 */
export const exportTeamToCSV = async (orgId: string): Promise<void> => {
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    // Get all team members including active and pending
    const response = await axiosInstance.get(`/api/orgs/${orgId}/memberships/export/`, {
      responseType: 'blob'
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `team-members-${new Date().toISOString().split('T')[0]}.csv`);
    
    // Append to html page
    document.body.appendChild(link);
    
    // Force download
    link.click();
    
    // Clean up and remove the link
    link.parentNode?.removeChild(link);
  } catch (error) {
    console.error('Error exporting team to CSV:', error);
    throw error;
  }
};

/**
 * Resend an invite to a pending team member
 */
export const resendInvite = async (membershipId: string | number, orgId?: string): Promise<void> => {
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    devLog(`Resending invite for membership: ${membershipId}`, {
      endpoint: `/api/orgs/${orgId}/memberships/${membershipId}/resend_invite/`
    });
    
    await axiosInstance.post(`/api/orgs/${orgId}/memberships/${membershipId}/resend_invite/`);
  } catch (error) {
    console.error('Error resending invite:', error);
    throw error;
  }
};

/**
 * Cancel an invitation
 */
export const cancelInvite = async (membershipId: number, orgId?: string): Promise<void> => {
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    await axiosInstance.delete(`/api/orgs/${orgId}/memberships/${membershipId}/`);
  } catch (error) {
    console.error('Error canceling invite:', error);
    throw error;
  }
};

/**
 * Update a team member's role
 */
export const updateMemberRole = async (membershipId: number | string, roleId: number, orgId?: string | number): Promise<TeamMember> => {
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    devLog(`Updating role for membership ${membershipId} to role ${roleId}`, {
      endpoint: `/api/orgs/${orgId}/memberships/${membershipId}/`
    });
    
    const response = await axiosInstance.patch(`/api/orgs/${orgId}/memberships/${membershipId}/`, {
      role_id: roleId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
};

/**
 * Remove a team member from the organization
 */
export const removeMember = async (membershipId: string | number, orgId?: string | number): Promise<void> => {
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    devLog(`Removing member with membership ID: ${membershipId}`, {
      endpoint: `/api/orgs/${orgId}/memberships/${membershipId}/`
    });
    
    await axiosInstance.delete(`/api/orgs/${orgId}/memberships/${membershipId}/`);
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
};

/**
 * Fetch audit logs for the organization
 */
export const fetchAuditLogs = async (orgId?: string): Promise<AuditLogEntry[]> => {
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    const response = await axiosInstance.get(`/api/orgs/${orgId}/audit/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};

/**
 * Fetch last action for a specific user
 */
export const fetchLastUserAction = async (userId: string, orgId?: string): Promise<AuditLogEntry | null> => {
  if (!orgId || !userId) {
    return null;
  }

  try {
    const response = await axiosInstance.get(`/api/orgs/${orgId}/audit/?user=${userId}&limit=1`);
    const logs = response.data;
    return logs.length > 0 ? logs[0] : null;
  } catch (error) {
    console.error('Error fetching user last action:', error);
    return null;
  }
}; 