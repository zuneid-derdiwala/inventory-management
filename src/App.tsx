import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import EntryForm from "./pages/EntryForm";
import StockData from "./pages/StockData";
import Database from "./pages/Database";
import ManageDataPage from "./pages/ManageData";
import ProfileSettings from "./pages/ProfileSettings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AssignData from "./pages/AssignData";
import { DataProvider } from "@/context/DataContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DataProvider>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              <Route path="/assign-data" element={
                <ProtectedRoute>
                  <AssignData />
                </ProtectedRoute>
              } />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Index />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/entry-form" element={
                <ProtectedRoute>
                  <Layout>
                    <EntryForm />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/stock-data" element={
                <ProtectedRoute>
                  <Layout>
                    <StockData />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/database" element={
                <ProtectedRoute>
                  <Layout>
                    <Database />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/manage-data" element={
                <AdminRoute>
                  <Layout>
                    <ManageDataPage />
                  </Layout>
                </AdminRoute>
              } />
              <Route path="/profile-settings" element={
                <ProtectedRoute>
                  <Layout>
                    <ProfileSettings />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;