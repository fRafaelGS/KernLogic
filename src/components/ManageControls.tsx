import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { removeMember, resendInvite } from '@/services/teamService';
import { toast } from 'sonner';
import RoleChangeModal from './RoleChangeModal';
import { useAuth } from '@/contexts/AuthContext';

interface ManageControlsProps {
  membershipId: number;
  status: 'active' | 'pending';
  currentRoleId: number;
}

export const ManageControls: React.FC<ManageControlsProps> = ({
  membershipId,
  status,
  currentRoleId
}) => {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const queryClient = useQueryClient();

  const handleRemove = async () => {
    try {
      if (!orgId) {
        toast.error('Organization ID is missing');
        return;
      }
      
      await removeMember(membershipId, orgId);
      toast.success(status === 'pending' ? 'Invite canceled' : 'Member removed');
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error removing member:', error);
      }
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleResend = async () => {
    try {
      if (!orgId) {
        toast.error('Organization ID is missing');
        return;
      }
      
      await resendInvite(membershipId, orgId);
      toast.success('Invitation resent');
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error resending invitation:', error);
      }
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      {status === 'pending' ? (
        // For pending members, show direct action buttons
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
          >
            Resend
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemove}
          >
            Cancel
          </Button>
        </div>
      ) : (
        // For active members, show dropdown menu
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <RoleChangeModal 
              membershipId={membershipId}
              currentRoleId={currentRoleId}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Change Role
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-50 focus:bg-red-600"
              onSelect={handleRemove}
            >
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ManageControls; 