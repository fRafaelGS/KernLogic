import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewProduct } from '@/pages/NewProduct';
import { EditProduct } from '@/pages/EditProduct';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import ProductsPage from "@/pages/ProductsPage";

// Marketing Pages
import LandingPage from "./pages/marketing/LandingPage";
import PricingPage from "./pages/marketing/PricingPage";
import ProductPage from "./pages/marketing/ProductPage";

// App Pages
import NotFound from "./pages/NotFound";

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
                        <Toaster />
                        <Sonner />
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
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AuthProvider>
                </TooltipProvider>
            </QueryClientProvider>
        </Router>
    );
};

export default App;
