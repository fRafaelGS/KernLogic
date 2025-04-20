
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
  status: "active" | "away" | "offline";
}

const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Product Manager",
    email: "sarah.chen@example.com",
    avatar: "",
    status: "active",
  },
  {
    id: "2",
    name: "Mark Johnson",
    role: "Data Scientist",
    email: "mark.johnson@example.com",
    avatar: "",
    status: "active",
  },
  {
    id: "3",
    name: "Emily Davis",
    role: "Product Catalog Specialist",
    email: "emily.davis@example.com",
    avatar: "",
    status: "away",
  },
  {
    id: "4",
    name: "Alex Wong",
    role: "Technical Manager",
    email: "alex.wong@example.com",
    avatar: "",
    status: "offline",
  },
];

const TeamPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team</h1>
            <p className="text-muted-foreground">Manage your team members and their roles</p>
          </div>
          <Button variant="default">Invite Member</Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={
                      member.status === "active"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : member.status === "away"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-800 border-slate-200"
                    }
                  >
                    {member.status === "active"
                      ? "Active"
                      : member.status === "away"
                      ? "Away"
                      : "Offline"}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;
