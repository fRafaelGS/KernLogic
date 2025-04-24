import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from 'lucide-react';

const teamMembers = [
  { id: 1, name: 'Ana Rodríguez', role: 'Owner / GM', email: 'ana.rodriguez@example.com', avatar: '/avatars/ana.png' },
  { id: 2, name: 'Jorge Pérez', role: 'E-com Specialist', email: 'jorge.perez@example.com', avatar: '/avatars/jorge.png' },
  { id: 3, name: 'María García', role: 'Inventory Manager', email: 'maria.garcia@example.com', avatar: '/avatars/maria.png' },
  // Add more placeholder members if needed
];

const TeamPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-enterprise-900">Team Management</h1>
          <p className="text-enterprise-600 mt-1">
            Manage team members and permissions. (Full functionality coming soon)
          </p>
        </div>
        <Button disabled>
          <Users className="mr-2 h-4 w-4" /> Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Team Members</CardTitle>
          <CardDescription>List of users with access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {teamMembers.map((member) => (
              <li key={member.id} className="flex items-center justify-between p-3 bg-white border rounded-md">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-enterprise-900">{member.name}</p>
                    <p className="text-xs text-enterprise-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-enterprise-600">{member.role}</span>
                  <Button variant="outline" size="sm" disabled>Manage</Button> {/* Disabled */}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamPage;
