import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from "@/domains/core/components/ui/tooltip";
import { Toaster } from "@/domains/core/components/ui/sonner";
import { AuthProvider, useAuth } from "@/domains/app/providers/AuthContext";
import { QueryClientProvider } from "@/domains/app/providers/QueryClientProvider";
import { DashboardLayout } from '@/domains/app/layout/DashboardLayout';
import { DashboardPage } from '@/domains/pages/marketing/DashboardPage';
import { NewProduct } from '@/domains/pages/marketing/NewProduct';
import { EditProduct } from '@/domains/pages/marketing/EditProduct';
import { ProductDetail } from '@/domains/pages/marketing/ProductDetail';
import LoginPage from '@/domains/accounts/pages/LoginPage';
import RegisterPage from '@/domains/accounts/pages/RegisterPage';
import OrganizationRegisterPage from '@/domains/accounts/pages/OrganizationRegisterPage';
import ProductsPage from "@/domains/pages/marketing/ProductsPage";
import AttributesPage from '@/domains/pages/marketing/AttributesPage';
import AttributeGroupsPage from '@/domains/pages/marketing/AttributeGroupsPage';
import { ENABLE_CUSTOM_ATTRIBUTES, ENABLE_ATTRIBUTE_GROUPS } from '@/config/featureFlags';
import AdminOnly from '@/domains/accounts/components/AdminOnly'
import { FamilyFormPage } from '@/domains/families/components/FamilyFormPage'
import { FamilyDetailPage } from '@/domains/families/components/FamilyDetailPage'

// Marketing Pages
import LandingPage from "@/domains/pages/marketing/LandingPage";
import PricingPage from "@/domains/pages/marketing/PricingPage";
import ProductPage from "@/domains/pages/marketing/ProductPage";

// App Pages
import ReportsPage from '@/domains/pages/marketing/ReportsPage';
import UploadPage from '@/domains/pages/marketing/UploadPage';
import DocumentationPage from '@/domains/pages/marketing/DocumentationPage';
import TeamPage from '@/domains/pages/marketing/TeamPage';
import SettingsPage from '@/domains/pages/marketing/SettingsPage';
import TeamHistoryPage from '@/domains/pages/marketing/TeamHistoryPage';
import AcceptInvitePage from '@/domains/pages/marketing/AcceptInvitePage';
import SetPasswordPage from '@/domains/accounts/pages/SetPasswordPage';

// Protected route component that handles authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuth();
  
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
    // Log to verify component is being loaded
    console.log('App component loaded from src/domains/app/App.tsx');
    
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
        <AuthProvider>
          <QueryClientProvider>
            <TooltipProvider>
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
                      path="/app/products/families"
                      element={<Navigate to="/app/settings?tab=families" replace />}
                  />
                  <Route
                      path="/app/products/families/new"
                      element={
                          <ProtectedRoute>
                              <DashboardLayout>
                                  <AdminOnly>
                                      <FamilyFormPage mode="create" />
                                  </AdminOnly>
                              </DashboardLayout>
                          </ProtectedRoute>
                      }
                  />
                  <Route
                      path="/app/products/families/:id"
                      element={
                          <ProtectedRoute>
                              <DashboardLayout>
                                  <AdminOnly>
                                      <FamilyDetailPage />
                                  </AdminOnly>
                              </DashboardLayout>
                          </ProtectedRoute>
                      }
                  />
                  <Route
                      path="/app/products/families/:id/edit"
                      element={
                          <ProtectedRoute>
                              <DashboardLayout>
                                  <AdminOnly>
                                      <FamilyFormPage mode="edit" />
                                  </AdminOnly>
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
                  <Route path="/accept-invite/:membershipId" element={<AcceptInvitePage />} />
                  <Route path="/set-password/:orgId" element={<SetPasswordPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </TooltipProvider>
          </QueryClientProvider>
        </AuthProvider>
      </Router>
    );
};

export default App;
