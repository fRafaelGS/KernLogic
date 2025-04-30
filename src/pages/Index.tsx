import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { FileUpload } from "@/components/upload/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseIcon, PackageIcon, TagIcon, FileTextIcon, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productService } from "@/services/productService";
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
                className="w-full justify-start text-left font-normal mb-2"
                onClick={() => navigate('/app/v1/products')}
              >
                <Package className="mr-2 h-4 w-4" /> View Products
              </Button>
              <Button 
                className="w-full justify-start text-left font-normal" 
                onClick={() => navigate('/app/v1/products/new')}
              >
                <Plus className="mr-2 h-4 w-4" /> Create New Product
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
