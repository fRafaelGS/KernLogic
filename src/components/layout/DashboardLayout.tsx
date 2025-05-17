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
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <Header />
        <main className="app-main-scroll flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
          <div className="flex flex-1 flex-col min-h-0 px-2 sm:px-3 min-w-0">
            {children}
          </div>
        </main>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
