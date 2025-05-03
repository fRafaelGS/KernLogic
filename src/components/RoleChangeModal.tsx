import React, { useState, useEffect } from 'react';
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
import { fetchRoles, updateMemberRole } from '@/services/teamService';
import { toast } from 'sonner';

interface RoleChangeModalProps {
  membershipId: number;
  currentRoleId: number;
  trigger: React.ReactNode;
}

export const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  membershipId,
  currentRoleId,
  trigger
}) => {
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState<number>(currentRoleId);
  const [open, setOpen] = useState(false);

  // Keep internal state in sync with props
  useEffect(() => {
    setRoleId(currentRoleId);
  }, [currentRoleId]);

  // Fetch available roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles
  });

  // Setup mutation for updating role
  const updateMutation = useMutation({
    mutationFn: () => updateMemberRole(membershipId, roleId),
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setOpen(false);
    },
    onError: (error: any) => {
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
    
    updateMutation.mutate();
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