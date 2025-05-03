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

// TODO: This should be integrated with AuthContext
// For now, we'll use a mock organization ID
const MOCK_ORG_ID = "80a23f5f-27da-46d0-9b7f-bcc01f0d4313";

/**
 * Fetch team members for the current organization with optional filters
 */
export const fetchTeamMembers = async (
  search?: string,
  role?: string,
  status?: string
): Promise<TeamMember[]> => {
  // In a real app, we would get the org ID from auth context
  // const { currentOrgId } = useAuth();
  const currentOrgId = MOCK_ORG_ID;
  
  if (!currentOrgId) {
    throw new Error('No organization selected');
  }

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (role) params.role = role;
  if (status) params.status = status;

  console.log('Fetching team members with params:', params);

  // For development environment, use mock data that respects filters
  if (process.env.NODE_ENV === 'development') {
    // Mock data that we'll filter client-side
    const mockData: TeamMember[] = [
      { 
        id: 1, 
        user: { id: 'user1', email: 'rgarciasaraiva@gmail.com', name: 'You (Owner)' }, 
        org_id: currentOrgId,
        role: { id: 1, name: 'Admin', description: 'Full access', permissions: [] }, 
        status: 'active' as const, 
        invited_at: '2023-05-01T12:00:00Z',
        last_login: '2023-05-01T12:00:00Z'
      },
      { 
        id: 2, 
        user: { id: 'user2', email: 'jane@example.com', name: 'Jane Doe' }, 
        org_id: currentOrgId,
        role: { id: 2, name: 'Editor', description: 'Can edit items', permissions: [] }, 
        status: 'active' as const, 
        invited_at: '2023-04-15T09:00:00Z',
        last_login: '2023-04-30T09:00:00Z'
      },
      { 
        id: 3, 
        user: { id: 'user3', email: 'bob@example.com', name: 'Bob Smith' }, 
        org_id: currentOrgId,
        role: { id: 3, name: 'Viewer', description: 'View only', permissions: [] }, 
        status: 'pending' as const, 
        invited_at: '2023-05-02T15:30:00Z'
      },
    ];

    // Filter the mock data based on the search, role, and status parameters
    return mockData.filter(member => {
      // Filter by search (name or email)
      if (search && !member.user.name.toLowerCase().includes(search.toLowerCase()) && 
          !member.user.email.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      
      // Filter by role
      if (role && member.role.name !== role) {
        return false;
      }
      
      // Filter by status
      if (status && member.status !== status) {
        return false;
      }
      
      // If all filters pass, include this member
      return true;
    });
  }
  
  try {
    const response = await axiosInstance.get(`/api/teams/orgs/${currentOrgId}/members/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
};

/**
 * Invite a new team member to the organization
 */
export const inviteMember = async (email: string, roleId: number): Promise<TeamMember> => {
  const currentOrgId = MOCK_ORG_ID;
  
  if (!currentOrgId) {
    throw new Error('No organization selected');
  }

  const response = await axiosInstance.post(`/api/teams/orgs/${currentOrgId}/members/`, {
    email,
    role_id: roleId
  });
  
  return response.data;
};

/**
 * Resend an invite to a pending team member
 */
export const resendInvite = async (membershipId: number): Promise<void> => {
  const currentOrgId = MOCK_ORG_ID;
  
  if (!currentOrgId) {
    throw new Error('No organization selected');
  }

  await axiosInstance.post(`/api/teams/orgs/${currentOrgId}/members/${membershipId}/resend-invite/`);
};

/**
 * Cancel a pending invitation
 */
export const cancelInvite = async (membershipId: number): Promise<void> => {
  await removeMember(membershipId);
};

/**
 * Fetch all available roles
 */
export const fetchRoles = async (): Promise<Role[]> => {
  const response = await axiosInstance.get('/api/teams/roles/');
  return response.data;
};

/**
 * Update a team member's role
 */
export const updateMemberRole = async (membershipId: number, roleId: number): Promise<TeamMember> => {
  const currentOrgId = MOCK_ORG_ID;
  
  if (!currentOrgId) {
    throw new Error('No organization selected');
  }

  const response = await axiosInstance.patch(`/api/teams/orgs/${currentOrgId}/members/${membershipId}/`, {
    role_id: roleId
  });
  
  return response.data;
};

/**
 * Remove a team member from the organization
 */
export const removeMember = async (membershipId: number): Promise<void> => {
  const currentOrgId = MOCK_ORG_ID;
  
  if (!currentOrgId) {
    throw new Error('No organization selected');
  }

  await axiosInstance.delete(`/api/teams/orgs/${currentOrgId}/members/${membershipId}/`);
};

/**
 * Fetch audit logs for the organization
 */
export const fetchAuditLogs = async (): Promise<AuditLogEntry[]> => {
  const currentOrgId = MOCK_ORG_ID;
  
  if (!currentOrgId) {
    throw new Error('No organization selected');
  }

  try {
    const response = await axiosInstance.get(`/api/teams/orgs/${currentOrgId}/audit-logs/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    
    // For development, return mock data if API call fails
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          id: 1,
          user: { id: 'user1', email: 'admin@example.com', name: 'Admin User' },
          org_id: currentOrgId,
          action: 'invite',
          target_type: 'Membership',
          target_id: 2,
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          details: { email: 'jane@example.com', role: 'Editor' }
        },
        {
          id: 2,
          user: { id: 'user1', email: 'admin@example.com', name: 'Admin User' },
          org_id: currentOrgId,
          action: 'role_change',
          target_type: 'Membership',
          target_id: 2,
          timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          details: { from: 'Editor', to: 'Admin' }
        },
        {
          id: 3,
          user: { id: 'user1', email: 'admin@example.com', name: 'Admin User' },
          org_id: currentOrgId,
          action: 'remove',
          target_type: 'Membership',
          target_id: 3,
          timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          details: { email: 'removed@example.com', role: 'Viewer' }
        }
      ];
    }
    
    return [];
  }
}; 