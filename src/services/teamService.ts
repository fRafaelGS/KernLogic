import axiosInstance from '@/lib/axiosInstance';
import { useAuth } from '@/contexts/AuthContext';

// Types for team members
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
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

// Utility function to log in development only
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

/**
 * Fetch team members for the current organization with optional filters
 */
export const fetchTeamMembers = async (
  search?: string,
  role?: string,
  status?: string,
  orgId?: string | number
): Promise<TeamMember[]> => {
  // Validate that we have an organization ID
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (role) params.role = role;
  if (status) params.status = status;

  devLog('Fetching team members with params:', params);
  
  try {
    const response = await axiosInstance.get(`/orgs/${orgId}/memberships/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
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
      endpoint: `/orgs/${orgId}/memberships/`
    });
    
    const response = await axiosInstance.post(`/orgs/${String(orgId)}/memberships/`, {
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
      endpoint: `/orgs/${orgId}/memberships/bulk/`
    });

    const response = await axiosInstance.post(`/orgs/${String(orgId)}/memberships/bulk/`, {
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
    const response = await axiosInstance.get(`/orgs/${orgId}/memberships/export/`, {
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
      endpoint: `/orgs/${orgId}/memberships/${membershipId}/resend_invite/`
    });
    
    await axiosInstance.post(`/orgs/${orgId}/memberships/${membershipId}/resend_invite/`);
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
    await axiosInstance.delete(`/orgs/${orgId}/memberships/${membershipId}/`);
  } catch (error) {
    console.error('Error canceling invite:', error);
    throw error;
  }
};

/**
 * Fetch available roles for the current organization
 */
export const fetchRoles = async (orgId?: string | number): Promise<Role[]> => {
  if (!orgId) {
    throw new Error('No organization ID provided');
  }

  try {
    devLog(`Fetching roles for organization: ${orgId}`, {
      endpoint: `/orgs/${orgId}/roles/`
    });
    
    const response = await axiosInstance.get(`/orgs/${orgId}/roles/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
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
      endpoint: `/orgs/${orgId}/memberships/${membershipId}/`
    });
    
    const response = await axiosInstance.patch(`/orgs/${String(orgId)}/memberships/${membershipId}/`, {
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
      endpoint: `/orgs/${orgId}/memberships/${membershipId}/`
    });
    
    await axiosInstance.delete(`/orgs/${String(orgId)}/memberships/${membershipId}/`);
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
    const response = await axiosInstance.get(`/orgs/${orgId}/audit/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}; 