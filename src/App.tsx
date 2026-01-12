import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupGlobalErrorHandlers, reportComponentError } from "@/lib/utils/error-reporting";
import Auth from "./pages/Auth";
import Contacts from "./pages/Contacts";
import Calls from "./pages/Calls";
import ContactSettings from "./pages/ContactSettings";
import ContactStatusesSettings from "./pages/ContactStatusesSettings";
import Campaigns from "./pages/Campaigns";
import NewCampaign from "./pages/NewCampaign";
import CampaignDetail from "./pages/CampaignDetail";
import Conversations from "./pages/Conversations";
import WhatsAppNumbers from "./pages/WhatsAppNumbers";
import NotFound from "./pages/NotFound";
import SetupAccount from "./pages/SetupAccount";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { UserClientRoute } from "./components/UserClientRoute";
import { AdminLayout } from "@/features/admin";
import TenantManagement from "./pages/admin/TenantManagement";
import TenantSettings from "./pages/admin/TenantSettings";
import TenantCustomFields from "./pages/admin/TenantCustomFields";
import Integrations from "./pages/Integrations";
import OAuthCallback from "./pages/OAuthCallback";

// Setup global error handlers on app initialization
setupGlobalErrorHandlers();

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary onError={reportComponentError}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup-account" element={<SetupAccount />} />

            {/* OAuth Callback - Accessible to all authenticated users */}
            <Route
              path="/oauth/callback"
              element={
                <ProtectedRoute>
                  <OAuthCallback />
                </ProtectedRoute>
              }
            />

            {/* SuperAdmin Routes */}
            <Route element={
              <ProtectedRoute>
                <SuperAdminRoute>
                  <AdminLayout />
                </SuperAdminRoute>
              </ProtectedRoute>
            }>
              <Route path="/admin" element={<Navigate to="/admin/tenants" replace />} />
              <Route path="/admin/tenants" element={<TenantManagement />} />
              <Route path="/admin/tenants/:id/settings" element={<TenantSettings />} />
              <Route path="/admin/tenants/:id/custom-fields" element={<TenantCustomFields />} />
              <Route path="/admin/tenants/:id/whatsapp-numbers" element={<WhatsAppNumbers />} />
              <Route path="/admin/integrations" element={<Integrations />} />
            </Route>
            
            {/* User Client Routes */}
            <Route element={
              <ProtectedRoute>
                <UserClientRoute>
                  <Layout />
                </UserClientRoute>
              </ProtectedRoute>
            }>
            <Route path="/" element={<Navigate to="/contacts" replace />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/settings" element={<ContactSettings />} />
              <Route path="/contacts/settings/statuses" element={<ContactStatusesSettings />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/new" element={<NewCampaign />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/calls" element={<Calls />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
