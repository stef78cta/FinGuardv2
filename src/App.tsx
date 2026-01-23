import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import AuthGuard from "@/components/auth/AuthGuard";
import AdminGuard from "@/components/auth/AdminGuard";
import { CompanyGuard } from "@/components/auth/CompanyGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import IncarcareBalanta from "./pages/IncarcareBalanta";
import RapoarteFinanciare from "./pages/RapoarteFinanciare";
import AnalizeFinanciare from "./pages/AnalizeFinanciare";
import IndicatoriCheie from "./pages/IndicatoriCheie";
import AnalizeComparative from "./pages/AnalizeComparative";
import AlteAnalize from "./pages/AlteAnalize";
import PreviziuniBugetare from "./pages/PreviziuniBugetare";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import StyleGuide from "./pages/new_StyleGuide";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/style-guide" element={<StyleGuide />} />
              
              {/* Protected App Routes - with Company Guard */}
              <Route path="/app" element={
                <AuthGuard>
                  <CompanyGuard>
                    <AppLayout />
                  </CompanyGuard>
                </AuthGuard>
              }>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="incarcare-balanta" element={<IncarcareBalanta />} />
                <Route path="rapoarte-financiare" element={<RapoarteFinanciare />} />
                <Route path="analize-financiare" element={<AnalizeFinanciare />} />
                <Route path="indicatori-cheie" element={<IndicatoriCheie />} />
                <Route path="analize-comparative" element={<AnalizeComparative />} />
                <Route path="alte-analize" element={<AlteAnalize />} />
                <Route path="previziuni-bugetare" element={<PreviziuniBugetare />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Admin Routes - Requires Admin Role */}
              <Route path="/admin" element={
                <AuthGuard>
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                </AuthGuard>
              }>
                <Route index element={<Admin />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
