import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "react-hot-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-enterprise-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-2 sm:p-3">
          <div className="mx-auto max-w-full">
            {children}
          </div>
        </main>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
