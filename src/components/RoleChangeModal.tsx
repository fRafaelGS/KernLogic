import React, { useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { fetchRoles, updateMemberRole, TeamMember, Role } from '@/services/teamService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from "@/components/ui/label";

interface RoleChangeModalProps {
  membershipId: number;
  currentRoleId: number;
  trigger: React.ReactNode;
}

type UpdateRoleData = {
  membershipId: number;
  roleId: number;
};

export const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  membershipId,
  currentRoleId,
  trigger
}) => {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState<number>(currentRoleId);
  const [open, setOpen] = useState(false);

  // Keep internal state in sync with props
  useEffect(() => {
    setRoleId(currentRoleId);
  }, [currentRoleId]);

  // Fetch available roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles', orgId],
    queryFn: () => {
      if (!orgId) {
        console.error('[RoleChangeModal] No organization ID available for fetching roles');
        throw new Error('No organization ID available');
      }
      return fetchRoles(orgId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(orgId), // Only run if we have an org ID
  });

  // Setup mutation for updating role
  const updateMutation = useMutation<TeamMember, Error, UpdateRoleData>({
    mutationFn: ({ membershipId, roleId }) => {
      if (!orgId) {
        throw new Error('No organization ID available');
      }
      return updateMemberRole(membershipId, roleId, orgId);
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setOpen(false);
    },
    onError: (error: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating role:', error);
      }
      toast.error(`Failed to update role: ${error.message}`);
    }
  });

  const handleRoleChange = (value: string) => {
    setRoleId(Number(value));
  };

  const handleSubmit = () => {
    if (roleId === currentRoleId) {
      return toast.info('Role is unchanged');
    }
    
    updateMutation.mutate({ membershipId, roleId });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Member Role</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Select Role
            </label>
            <Select
              value={roleId.toString()}
              onValueChange={handleRoleChange}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roles.find(r => r.id === roleId)?.description && (
              <p className="text-xs text-gray-500 mt-1">
                {roles.find(r => r.id === roleId)?.description}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateMutation.isPending || roleId === currentRoleId}
          >
            {updateMutation.isPending ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleChangeModal; 