import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/domains/core/components/ui/dialog';
import { Button } from '@/domains/core/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { fetchRoles, updateMemberRole } from '@/services/teamService';
import { Role } from '@/types/team';

interface SelectRoleModalProps {
  membershipId: string | number;
  currentRoleName: string;
  open: boolean;
  onClose: () => void;
}

const SelectRoleModal: React.FC<SelectRoleModalProps> = ({
  membershipId,
  currentRoleName,
  open,
  onClose
}) => {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Fetch available roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles', orgId],
    queryFn: () => {
      if (!orgId) {
        throw new Error('No organization ID available');
      }
      return fetchRoles(orgId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(orgId) && open, // Only run if we have an org ID and modal is open
  });

  // Setup mutation for updating role
  const updateMutation = useMutation({
    mutationFn: ({ membershipId, roleId }: { membershipId: string | number, roleId: number }) => {
      if (!orgId) {
        throw new Error('No organization ID available');
      }
      return updateMemberRole(Number(membershipId), roleId, orgId);
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Error updating role:', error);
      toast.error(`Failed to update role: ${error.message || 'Unknown error'}`);
    }
  });

  // Find and select current role on load
  useEffect(() => {
    if (open && roles.length > 0) {
      const current = roles.find(role => role.name === currentRoleName);
      setSelectedRole(current || null);
    }
  }, [open, roles, currentRoleName]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleSave = () => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    if (selectedRole.name === currentRoleName) {
      toast.info('Role is unchanged');
      onClose();
      return;
    }

    updateMutation.mutate({
      membershipId,
      roleId: selectedRole.id
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Team Member Role</DialogTitle>
          <DialogDescription>
            Select a new role for this team member
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            {roles.map(role => (
              <div 
                key={role.id}
                className={`p-4 border rounded-md cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedRole?.id === role.id ? 'border-primary bg-accent' : ''
                }`}
                onClick={() => handleRoleSelect(role)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${selectedRole?.id === role.id ? 'bg-primary' : 'border border-muted-foreground'}`} />
                  <div className="font-medium">{role.name}</div>
                </div>
                {role.description && (
                  <div className="text-sm text-muted-foreground mt-1 ml-6">
                    {role.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending || !selectedRole}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectRoleModal; 