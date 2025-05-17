import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "react-hot-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-x-hidden bg-enterprise-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex flex-1 flex-col min-h-0">
            {children}
          </div>
        </main>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
