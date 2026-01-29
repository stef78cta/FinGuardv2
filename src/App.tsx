import { useEffect, useRef } from 'react';
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
import NewaStyleGuide from "./pages/newa_StyleGuide";

/**
 * Configurație React Query optimizată pentru stabilitate UI.
 * 
 * - refetchOnWindowFocus: false - previne reset-ul UI la schimbarea tab-ului
 * - staleTime: 2 minute - datele rămân "fresh" timp de 2 minute
 * - gcTime: 5 minute - cache-ul se păstrează 5 minute după unmount
 * 
 * Aceste setări asigură că:
 * 1. La revenirea în tab, UI-ul rămâne identic (fără refetch automat)
 * 2. Datele nu sunt considerate "stale" imediat
 * 3. Cache-ul persistă suficient pentru navigare între pagini
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dezactivează refetch la focus - previne resetul UI la schimbarea tab-ului
      refetchOnWindowFocus: false,
      // Dezactivează refetch la reconectare la rețea
      refetchOnReconnect: false,
      // Datele rămân "fresh" 2 minute - evită refetch-uri inutile
      staleTime: 2 * 60 * 1000,
      // Cache-ul se păstrează 5 minute după unmount
      gcTime: 5 * 60 * 1000,
      // Păstrează datele anterioare în timpul refetch-ului
      placeholderData: (previousData: unknown) => previousData,
      // Retry conservator pentru erori
      retry: 1,
    },
  },
});

/**
 * ============================================
 * DIAGNOSTIC: App Mount Counter
 * Ajută la identificarea remount-urilor.
 * ============================================
 */
let appMountCounter = 0;

const App = () => {
  const mountRef = useRef(false);
  
  useEffect(() => {
    appMountCounter++;
    const currentMount = appMountCounter;
    console.log(`%c[APP] App MOUNTED - count: ${currentMount}`, 'background: #00ff00; color: #000; padding: 4px; font-weight: bold;');
    console.log(`[APP] Mount timestamp: ${new Date().toISOString()}`);
    mountRef.current = true;
    
    return () => {
      console.log(`%c[APP] App UNMOUNTED - was mount #${currentMount}`, 'background: #ff0000; color: #fff; padding: 4px; font-weight: bold;');
    };
  }, []);
  
  return (
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
              <Route path="/style-guide" element={<NewaStyleGuide />} />
              <Route path="/style-guide-v2" element={<NewaStyleGuide />} />
              
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
};

export default App;
