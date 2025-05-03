import React, { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { toast } from 'react-hot-toast';

const TeamPage: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState([
    // Assuming you have an initial list of team members
  ]);

  // Handle avatar update for a team member
  const handleAvatarUpdate = (memberId: string, newAvatarUrl: string) => {
    // Update the local state
    setTeamMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === memberId 
          ? { ...member, avatar_url: newAvatarUrl } 
          : member
      )
    );
    
    toast.success('Avatar updated successfully');
  };

  return (
    <div>
      {teamMembers.map(member => (
        <Avatar
          key={member.id}
          size="md"
          name={member.name}
          avatarUrl={member.avatar_url}
          userId={member.id}
          showUploadButton={member.id === user?.id}
          onAvatarUpdated={(newUrl) => handleAvatarUpdate(member.id, newUrl)}
        />
      ))}
    </div>
  );
};

export default TeamPage; 