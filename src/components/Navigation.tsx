import { useState, useEffect } from 'react';
import { Shield, Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const Navigation = () => {
  const navigate = useNavigate();
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
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
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
  
  return <nav className={`fixed top-0 left-0 right-0 z-[var(--newa-z-sticky)] transition-all duration-300 ${isScrolled ? 'bg-[var(--newa-surface-light)]/90 backdrop-blur-lg shadow-soft' : 'bg-transparent'}`}>
      <div className="container-custom">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 newa-focus-ring rounded-[var(--newa-radius-md)]">
            <div className="w-8 h-8 bg-[var(--newa-brand-primary-dark)] rounded-[var(--newa-radius-md)] flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-[var(--newa-text-inverse)]" />
            </div>
            <span className="text-xl font-bold text-[var(--newa-brand-primary-dark)]">FinGuard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <button onClick={() => scrollToSection('demo')} className="text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] font-medium transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-2 py-1">
              Cum funcționează
            </button>
            <button onClick={() => scrollToSection('features')} className="text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] font-medium transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-2 py-1">
              Caracteristici
            </button>
            <button onClick={() => scrollToSection('testimonials')} className="text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] font-medium transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-2 py-1">
              Testimoniale
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] font-medium transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-2 py-1">
              Prețuri
            </button>
            <button onClick={() => scrollToSection('faq')} className="text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] font-medium transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-2 py-1">
              Întrebări frecvente
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            {authLoading ? (
              <div className="w-24 h-10 bg-[var(--newa-surface-canvas)] animate-pulse rounded-[40px]" />
            ) : user ? (
              <>
                <Link to="/app/dashboard" className="btn-primary h-10 py-2 leading-tight flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-10 h-10 rounded-full bg-[var(--newa-brand-accent-indigo)] text-[var(--newa-text-inverse)] font-bold flex items-center justify-center hover:opacity-90 transition-opacity newa-focus-ring">
                      {getUserInitials()}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3 rounded-[var(--newa-radius-lg)]" align="end">
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--newa-text-primary)] font-medium">
                        Bună, {getUserDisplayName()}
                      </p>
                      <Separator />
                      <button 
                        type="button"
                        onClick={handleSignOut}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2 text-[var(--newa-brand-danger-rose)] hover:opacity-90 text-sm font-medium py-2 px-2 rounded-[var(--newa-radius-sm)] hover:bg-[var(--newa-alert-danger-bg)] transition-colors newa-focus-ring"
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
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)]">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && <div className="lg:hidden absolute top-full left-0 right-0 bg-[var(--newa-surface-light)] shadow-large border-t border-[var(--newa-border-default)] animate-fade-in-up rounded-b-[var(--newa-radius-xl)]">
            <div className="py-6 px-4 space-y-4">
              <button onClick={() => scrollToSection('demo')} className="block w-full text-left py-3 px-4 text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] hover:bg-[var(--newa-state-hover)] rounded-[var(--newa-radius-md)] font-medium transition-all duration-200 newa-focus-ring">
                Cum funcționează
              </button>
              <button onClick={() => scrollToSection('features')} className="block w-full text-left py-3 px-4 text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] hover:bg-[var(--newa-state-hover)] rounded-[var(--newa-radius-md)] font-medium transition-all duration-200 newa-focus-ring">
                Caracteristici
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="block w-full text-left py-3 px-4 text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] hover:bg-[var(--newa-state-hover)] rounded-[var(--newa-radius-md)] font-medium transition-all duration-200 newa-focus-ring">
                Testimoniale
              </button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-3 px-4 text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] hover:bg-[var(--newa-state-hover)] rounded-[var(--newa-radius-md)] font-medium transition-all duration-200 newa-focus-ring">
                Prețuri
              </button>
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left py-3 px-4 text-[var(--newa-text-secondary)] hover:text-[var(--newa-brand-accent-indigo)] hover:bg-[var(--newa-state-hover)] rounded-[var(--newa-radius-md)] font-medium transition-all duration-200 newa-focus-ring">
                Întrebări frecvente
              </button>
              <div className="pt-4 border-t border-[var(--newa-border-default)] space-y-3">
                {user ? (
                  <>
                    <p className="text-center text-[var(--newa-text-secondary)] font-medium py-2">
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
                      className="btn-ghost w-full flex items-center justify-center gap-2 text-[var(--newa-brand-danger-rose)] hover:bg-[var(--newa-alert-danger-bg)]"
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