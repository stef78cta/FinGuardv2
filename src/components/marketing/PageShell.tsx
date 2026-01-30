import { useEffect, ReactNode } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface PageShellProps {
  title: string;
  heroTitle: string;
  heroSubtitle?: string;
  children: ReactNode;
  narrow?: boolean;
}

/**
 * PageShell - Wrapper comun pentru paginile publice marketing
 * Folosește design system NEWA și layout consistent cu landing page
 */
const PageShell = ({ 
  title, 
  heroTitle, 
  heroSubtitle, 
  children, 
  narrow = false 
}: PageShellProps) => {
  useEffect(() => {
    document.title = `${title} | FinGuard`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="min-h-screen bg-[var(--newa-surface-canvas)]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-[var(--newa-brand-primary-dark)] to-[var(--newa-surface-dark)]">
        <div className="container-custom text-center">
          <h1 className="headline text-[var(--newa-text-inverse)] mb-4">
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="subheadline text-[var(--newa-text-inverse)]/80 max-w-3xl mx-auto">
              {heroSubtitle}
            </p>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="section-padding">
        <div className={narrow ? 'container-narrow' : 'container-custom'}>
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PageShell;
