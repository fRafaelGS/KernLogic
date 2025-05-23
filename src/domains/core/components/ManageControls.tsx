import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/domains/core/components/ui/dropdown-menu';
import { Button } from '@/domains/core/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { removeMember, resendInvite } from '@/domains/organization/services/teamService';
import { toast } from 'sonner';
import SelectRoleModal from '@/domains/accounts/components/SelectRoleModal';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { PermissionGuard } from '@/domains/core/components/PermissionGuard';

interface ManageControlsProps {
  membershipId: string | number;
  status: 'active' | 'pending';
  currentRoleId: string | number;
  roleName: string;
}

export const ManageControls: React.FC<ManageControlsProps> = ({
  membershipId,
  status,
  currentRoleId,
  roleName
}) => {
  const { user, checkPermission } = useAuth();
  const orgId = user?.organization_id;
  const queryClient = useQueryClient();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  
  // Check permissions for the various actions
  const canInvite = checkPermission('team.invite');
  const canChangeRole = checkPermission('team.change_role');
  const canRemove = checkPermission('team.remove');

  const handleRemove = async () => {
    try {
      if (!orgId) {
        toast.error('Organization ID is missing');
        return;
      }
      
      // Additional check to ensure user has permission
      if (!canRemove) {
        toast.error('You do not have permission to remove team members');
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
      
      // Additional check to ensure user has permission
      if (!canInvite) {
        toast.error('You do not have permission to invite team members');
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
      {/* Role change modal - render conditionally when needed */}
      {canChangeRole && isRoleModalOpen && (
        <SelectRoleModal
          membershipId={membershipId}
          currentRoleName={roleName}
          open={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
        />
      )}

      {status === 'pending' ? (
        // For pending members, show direct action buttons
        <div className="flex space-x-2">
          {canInvite && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
            >
              Resend
            </Button>
          )}
          {canRemove && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              Cancel
            </Button>
          )}
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
            {canChangeRole && (
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                setIsRoleModalOpen(true);
              }}>
                Change Role
              </DropdownMenuItem>
            )}
            {canRemove && (
              <>
                {canChangeRole && <DropdownMenuSeparator />}
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-50 focus:bg-red-600"
                  onSelect={handleRemove}
                >
                  Remove Member
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ManageControls; 