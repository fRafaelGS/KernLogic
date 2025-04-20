
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { FileUpload } from "@/components/upload/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseIcon, PackageIcon, TagIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Data Alchemy Suite</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value="1,284"
            icon={PackageIcon}
            trend={{ value: "12%", positive: true }}
          />
          <StatCard
            title="Processed Data"
            value="876 MB"
            icon={DatabaseIcon}
            trend={{ value: "4%", positive: true }}
          />
          <StatCard
            title="Generated Descriptions"
            value="945"
            icon={FileTextIcon}
            trend={{ value: "8%", positive: true }}
          />
          <StatCard
            title="Applied Tags"
            value="3,721"
            icon={TagIcon}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Data Processing Overview</CardTitle>
                <CardDescription>
                  Current status of your data processing tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <ProgressCard
                    title="Industrial Coatings Catalog"
                    description="Auto-categorization and description generation in progress"
                    progress={68}
                  />
                  <ProgressCard
                    title="Marine Products Update"
                    description="Data cleaning and formatting completed, awaiting tagging"
                    progress={42}
                  />
                  <ProgressCard
                    title="New Specialty Products"
                    description="Processing complete - review ready"
                    progress={100}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to manage your product data
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Button variant="outline" className="h-auto flex-col items-center justify-center gap-1 p-6">
                <DatabaseIcon className="h-6 w-6" />
                <span>View Products</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-center justify-center gap-1 p-6">
                <FileTextIcon className="h-6 w-6" />
                <span>Generate Descriptions</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-center justify-center gap-1 p-6">
                <TagIcon className="h-6 w-6" />
                <span>Manage Tags</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-center justify-center gap-1 p-6">
                <PackageIcon className="h-6 w-6" />
                <span>Add Products</span>
              </Button>
            </CardContent>
          </Card>
          <FileUpload />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
