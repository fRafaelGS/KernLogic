import React, { useState } from 'react';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { inviteMember, TeamMember } from '@/domains/organization/services/teamService';
import { Role } from '@/domains/organization/types/team';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/domains/core/components/ui/dialog';
import { Button } from '@/domains/core/components/ui/button';
import { Label } from '@/domains/core/components/ui/label';
import { Input } from '@/domains/core/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/domains/core/components/ui/select';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface InviteUserModalProps {
  show: boolean;
  onHide: () => void;
  roles: Role[];
  onSuccess?: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ show, onHide, roles, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Get organization ID from auth context
  const { user } = useAuth();
  const orgId = user?.organization_id;
  
  // Form validation
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const canSubmit = selectedRoleId > 0 && isEmailValid(email);
  
  // Invite mutation
  const inviteMutation = useMutation<TeamMember, Error, { email: string; roleId: number }>({
    mutationFn: ({ email, roleId }) => {
      if (!orgId) {
        throw new Error('No organization ID available');
      }
      return inviteMember(email, roleId, orgId);
    },
    onSuccess: () => {
      setEmail('');
      setSelectedRoleId(0);
      setError(null);
      toast.success(`Invitation sent to ${email}`);
      onHide();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: any) => {
      console.error('Error inviting user:', err);
      
      let errorMessage = 'Failed to send invitation';
      
      // Handle different error formats
      if (err.response) {
        // Axios error with response
        const { data } = err.response;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data && typeof data === 'object') {
          if (data.detail) {
            errorMessage = data.detail;
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.error) {
            errorMessage = data.error;
          } else if (data.email) {
            errorMessage = `Email: ${data.email}`;
          }
        }
      } else if (err.message) {
        // Regular error object
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!selectedRoleId) {
      setError('Please select a role');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Sending single invite to API:', {
        email: email.trim(),
        roleId: selectedRoleId,
        orgId
      });
    }

    inviteMutation.mutate({
      email: email.trim(),
      roleId: selectedRoleId
    });
  };

  const handleClose = () => {
    inviteMutation.reset(); // Reset mutation state on close
    setEmail('');
    setSelectedRoleId(0);
    setError(null);
    onHide();
  };

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={inviteMutation.isPending}
                required
              />
              <p className="text-sm text-muted-foreground">
                We'll send an invitation email to this address
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={selectedRoleId.toString()} 
                onValueChange={(value) => setSelectedRoleId(parseInt(value, 10))} 
                disabled={inviteMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name} {role.description ? `- ${role.description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="outline"
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserModal; 