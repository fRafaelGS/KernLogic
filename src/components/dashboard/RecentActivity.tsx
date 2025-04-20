
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  target: string;
  timestamp: string;
}

const recentActivities: ActivityItem[] = [
  {
    id: "1",
    user: { name: "Sarah Chen", avatar: "" },
    action: "uploaded",
    target: "coating_products.csv",
    timestamp: "Just now",
  },
  {
    id: "2",
    user: { name: "Mark Johnson", avatar: "" },
    action: "generated descriptions for",
    target: "25 products",
    timestamp: "2 hours ago",
  },
  {
    id: "3",
    user: { name: "Emily Davis", avatar: "" },
    action: "categorized",
    target: "108 products",
    timestamp: "5 hours ago",
  },
  {
    id: "4",
    user: { name: "Alex Wong", avatar: "" },
    action: "cleaned data in",
    target: "industrial_coatings.xlsx",
    timestamp: "Yesterday",
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {activity.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span>{" "}
                  {activity.action}{" "}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
