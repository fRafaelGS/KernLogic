export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface Membership {
  id: number;
  user: User;
  org_id: string;
  role: Role;
  status: 'pending' | 'active' | 'inactive';
  invited_at: string;
  last_login?: string;
}

export interface InvitationToken {
  membershipId: string;
  token: string;
} 