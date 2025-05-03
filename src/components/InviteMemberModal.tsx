import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '@/services/api';
import InviteUserModal from './InviteUserModal';
import { Role } from '@/types/team';

const InviteMemberModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const { orgId } = useParams<{ orgId: string }>();
  const { data: roles = [] } = useQuery({
    queryKey: ['roles', orgId],
    queryFn: async () => {
      const response = await api.get(`/api/orgs/${orgId}/roles/`);
      return response.data as Role[];
    },
    enabled: !!orgId
  });

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)}
        data-component="invite-button"
        className="flex items-center"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Invite Member
      </Button>

      {showModal && (
        <InviteUserModal
          show={showModal}
          onHide={() => setShowModal(false)}
          roles={roles}
        />
      )}
    </>
  );
};

export default InviteMemberModal; 