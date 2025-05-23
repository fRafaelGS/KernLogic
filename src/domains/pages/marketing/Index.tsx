import { useEffect, useState } from "react";
import { DashboardLayout } from "@/domains/app/layout/DashboardLayout";
import { StatCard } from "@/domains/dashboard/components";
import { ProgressCard } from "@/domains/dashboard/components";
import { FileUpload } from "@/domains/core/components/upload/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/domains/core/components/ui/card";
import { DatabaseIcon, PackageIcon, TagIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/domains/core/components/ui/button";
import { productService } from "@/domains/products/services/productService";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    total_value: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await productService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to KernLogic</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={(stats.total_products ?? 0).toString()}
            icon={PackageIcon}
          />
          <StatCard
            title="Total Value"
            value={`$${(stats.total_value ?? 0).toFixed(2)}`}
            icon={DatabaseIcon}
          />
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
              <Button 
                variant="outline" 
                className="h-auto flex-col items-center justify-center gap-1 p-6"
                onClick={() => navigate('/app/products')}
              >
                <DatabaseIcon className="h-6 w-6" />
                <span>View Products</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col items-center justify-center gap-1 p-6"
                onClick={() => navigate('/app/products/new')}
              >
                <PackageIcon className="h-6 w-6" />
                <span>Add Product</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
