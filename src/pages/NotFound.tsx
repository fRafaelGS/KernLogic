
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DashboardLayout } from "@/domains/app/layout/DashboardLayout";
import { Button } from "@/domains/core/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <DashboardLayout>
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="mt-4 text-xl">Page not found</p>
        <p className="mt-2 text-muted-foreground">
          We couldn't find the page you were looking for.
        </p>
        <Button 
          className="mt-6" 
          onClick={() => navigate("/")}
        >
          Return to Dashboard
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default NotFound;
