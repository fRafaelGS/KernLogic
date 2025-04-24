import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewProduct } from '@/pages/NewProduct';
import { EditProduct } from '@/pages/EditProduct';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ProductsPage from "@/pages/ProductsPage";
import ButtonDemo from "@/pages/ButtonDemo";

// Marketing Pages
import LandingPage from "./pages/marketing/LandingPage";
import PricingPage from "./pages/marketing/PricingPage";
import ProductPage from "./pages/marketing/ProductPage";

// App Pages
import NotFound from "./pages/NotFound";
import ReportsPage from './pages/ReportsPage';
import UploadPage from './pages/UploadPage';
import DocumentationPage from './pages/DocumentationPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient();

// Protected route component that handles authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // While checking authentication status, show nothing
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // If authenticated, render the protected content
  return <>{children}</>;
};

export const App: React.FC = () => {
    return (
        <Router>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <AuthProvider>
                        <Sonner 
                          position="top-right"
                          richColors
                          toastOptions={{
                            classNames: {
                              toast: 'border border-enterprise-200 bg-white text-enterprise-900 shadow-lg',
                              title: 'text-sm font-semibold',
                              description: 'text-sm text-enterprise-600',
                              actionButton:
                                'bg-primary-600 text-white hover:bg-primary-700',
                              cancelButton:
                                'bg-enterprise-100 text-enterprise-700 hover:bg-enterprise-200',
                            },
                          }}
                        />
                        <Routes>
                            {/* Marketing Routes */}
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/marketing" element={<LandingPage />} />
                            <Route path="/marketing/pricing" element={<PricingPage />} />
                            <Route path="/marketing/product" element={<ProductPage />} />
                            
                            {/* Auth Routes */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            
                            {/* Protected App Routes */}
                            <Route
                                path="/app"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <DashboardPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/products"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <ProductsPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/products/new"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <NewProduct />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/products/:id/edit"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <EditProduct />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/reports"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <ReportsPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/upload"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <UploadPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/documentation"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <DocumentationPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/team"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <TeamPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/app/settings"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <SettingsPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            {/* UI Component Demo Routes */}
                            <Route
                                path="/app/ui/buttons"
                                element={
                                    <ProtectedRoute>
                                        <ButtonDemo />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AuthProvider>
                </TooltipProvider>
            </QueryClientProvider>
        </Router>
    );
};

export default App;
