import { Sidebar } from "@/domains/app/layout/Sidebar";
import { Header } from "@/domains/app/layout/Header";
import { Toaster } from "react-hot-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-x-hidden bg-enterprise-50">
      <Sidebar />
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <Header />
        <main className="scrollbar-hide overflow-y-auto flex-1 min-h-0 min-w-0">
          <div className="flex flex-1 flex-col min-h-0 px-2 sm:px-3 min-w-0">
            {children}
          </div>
        </main>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
