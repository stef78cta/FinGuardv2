import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import IncarcareBalanta from "./pages/IncarcareBalanta";
import RapoarteFinanciare from "./pages/RapoarteFinanciare";
import AnalizeFinanciare from "./pages/AnalizeFinanciare";
import IndicatoriCheie from "./pages/IndicatoriCheie";
import AnalizeComparative from "./pages/AnalizeComparative";
import AlteAnalize from "./pages/AlteAnalize";
import PreviziuniBugetare from "./pages/PreviziuniBugetare";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Protected App Routes */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incarcare-balanta" element={<IncarcareBalanta />} />
            <Route path="rapoarte-financiare" element={<RapoarteFinanciare />} />
            <Route path="analize-financiare" element={<AnalizeFinanciare />} />
            <Route path="indicatori-cheie" element={<IndicatoriCheie />} />
            <Route path="analize-comparative" element={<AnalizeComparative />} />
            <Route path="alte-analize" element={<AlteAnalize />} />
            <Route path="previziuni-bugetare" element={<PreviziuniBugetare />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
