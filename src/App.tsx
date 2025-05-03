import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewProduct } from '@/pages/NewProduct';
import { EditProduct } from '@/pages/EditProduct';
import { ProductDetail } from '@/pages/ProductDetail';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import OrganizationRegisterPage from '@/pages/auth/OrganizationRegisterPage';
import ProductsPage from "@/pages/ProductsPage";
import ButtonDemo from "@/pages/ButtonDemo";
import AttributesPage from '@/pages/AttributesPage';
import AttributeGroupsPage from '@/pages/AttributeGroupsPage';
import { ENABLE_CUSTOM_ATTRIBUTES, ENABLE_ATTRIBUTE_GROUPS } from '@/config/featureFlags';

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
import TeamHistoryPage from './pages/TeamHistoryPage';
import AcceptInvitePage from './pages/AcceptInvitePage';

const queryClient = new QueryClient();

// Protected route component that handles authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // While checking authentication status, show nothing
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  // For testing, we'll allow access even if not authenticated
  // In production, uncomment this to enforce authentication
  /*
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  */
  
  // If authenticated, render the protected content
  return <>{children}</>;
};

export const App: React.FC = () => {
    // Remove App.css styles that might be causing issues
    useEffect(() => {
      // Fix potential CSS issues with #root element
      const rootElement = document.getElementById('root');
      if (rootElement) {
        rootElement.style.maxWidth = 'none';
        rootElement.style.padding = '0';
        rootElement.style.margin = '0';
        rootElement.style.textAlign = 'left';
        rootElement.style.width = '100%';
        rootElement.style.height = '100vh';
        rootElement.style.overflow = 'auto'; // Changed from 'hidden' to 'auto' to allow scrolling
      }
    }, []);

    return (
        <Router>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <AuthProvider>
                        <Toaster 
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
                            <Route path="/register/:orgId" element={<OrganizationRegisterPage />} />
                            
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
                                path="/app/products/:id"
                                element={
                                    <ProtectedRoute>
                                        <ProductDetail />
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
                                path="/app/team/history"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <TeamHistoryPage />
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
                            {/* Attributes Page (with feature flag) */}
                            {ENABLE_CUSTOM_ATTRIBUTES && (
                              <Route
                                  path="/app/settings/attributes"
                                  element={
                                      <ProtectedRoute>
                                          <DashboardLayout>
                                              <AttributesPage />
                                          </DashboardLayout>
                                      </ProtectedRoute>
                                  }
                              />
                            )}
                            {/* Attribute Groups Page (with feature flag) */}
                            {ENABLE_ATTRIBUTE_GROUPS && (
                              <Route
                                  path="/app/settings/attribute-groups"
                                  element={
                                      <ProtectedRoute>
                                          <DashboardLayout>
                                              <AttributeGroupsPage />
                                          </DashboardLayout>
                                      </ProtectedRoute>
                                  }
                              />
                            )}
                            {/* UI Component Demo Routes */}
                            <Route
                                path="/app/ui/buttons"
                                element={
                                    <ProtectedRoute>
                                        <ButtonDemo />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/accept-invite/:membershipId/:token" element={<AcceptInvitePage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AuthProvider>
                </TooltipProvider>
            </QueryClientProvider>
        </Router>
    );
};

export default App;
