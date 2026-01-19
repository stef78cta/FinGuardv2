import { useState, useEffect } from 'react';
import { Shield, Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const Navigation = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilizator';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.full_name || user.email || '';
    return name.charAt(0).toUpperCase();
  };
  
  return <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-lg shadow-soft' : 'bg-transparent'}`}>
      <div className="container-custom">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">FinGuard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <button onClick={() => scrollToSection('demo')} className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200">
              Cum funcționează
            </button>
            <button onClick={() => scrollToSection('features')} className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200">
              Caracteristici
            </button>
            <button onClick={() => scrollToSection('testimonials')} className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200">
              Testimoniale
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200">
              Prețuri
            </button>
            <button onClick={() => scrollToSection('faq')} className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200">
              Întrebări frecvente
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            {authLoading ? (
              <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-lg" />
            ) : user ? (
              <>
                <Link to="/app/dashboard" className="btn-primary h-10 py-2 leading-tight flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center hover:bg-primary/90 transition-colors">
                      {getUserInitials()}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="end">
                    <div className="space-y-3">
                      <p className="text-sm text-foreground font-medium">
                        Bună, {getUserDisplayName()}
                      </p>
                      <Separator />
                      <button 
                        onClick={handleSignOut}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2 text-destructive hover:text-destructive/90 text-sm font-medium py-2 px-2 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {isLoggingOut ? 'Se deconectează...' : 'Sign out'}
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost h-10 py-2 leading-tight min-w-[120px] text-center flex items-center justify-center">
                  Autentificare
                </Link>
                <Link to="/signup" className="btn-primary h-10 py-2 leading-tight min-w-[120px] text-center flex items-center justify-center">
                  Înregistrare
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-700 hover:text-indigo-600 transition-colors duration-200">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-large border-t border-gray-100 animate-fade-in-up">
            <div className="py-6 px-4 space-y-4">
              <button onClick={() => scrollToSection('demo')} className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200">
                Cum funcționează
              </button>
              <button onClick={() => scrollToSection('features')} className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200">
                Caracteristici
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200">
                Testimoniale
              </button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200">
                Prețuri
              </button>
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200">
                Întrebări frecvente
              </button>
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {user ? (
                  <>
                    <p className="text-center text-gray-700 font-medium py-2">
                      Bună, {getUserDisplayName()}
                    </p>
                    <Link 
                      to="/app/dashboard" 
                      className="btn-primary w-full flex items-center justify-center gap-2" 
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isLoggingOut}
                      className="btn-ghost w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {isLoggingOut ? 'Se deconectează...' : 'Sign out'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-ghost w-full block text-center" onClick={() => setIsMobileMenuOpen(false)}>
                      Autentificare
                    </Link>
                    <Link to="/signup" className="btn-primary w-full block text-center" onClick={() => setIsMobileMenuOpen(false)}>
                      Înregistrare
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navigation;