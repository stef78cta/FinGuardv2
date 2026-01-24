import { useEffect, useRef, useState } from 'react';
import { Play, ArrowRight, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import dashboardMockup from '../assets/dashboard-mockup.png';

const HeroSection = () => {
  const [counters, setCounters] = useState({ saved: 0, kpis: 0, accuracy: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const timer = setInterval(() => {
      setCounters(prev => ({
        saved: Math.min(prev.saved + 87 / steps, 87),
        kpis: Math.min(prev.kpis + 15 / steps, 15),
        accuracy: Math.min(prev.accuracy + 99.3 / steps, 99.3),
      }));
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible]);

  const scrollToDemo = () => {
    const element = document.getElementById('demo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section 
      id="hero"
      ref={heroRef}
      className="relative min-h-[auto] py-12 md:min-h-[80vh] md:py-0 flex items-center overflow-hidden pt-20 md:pt-24"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--newa-surface-canvas)] via-[var(--newa-selection-bg)]/30 to-purple-50/50"></div>
      <div className="absolute top-10 right-10 w-48 h-48 bg-gradient-to-br from-[var(--newa-brand-accent-indigo)]/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-gradient-to-br from-[var(--newa-brand-accent-emerald)]/10 to-teal-500/10 rounded-full blur-3xl"></div>

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            {/* Headline with clear hierarchy */}
            <div className="space-y-5">
              <h1 className="animate-fade-in-up">
                <span className="block text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--newa-text-primary)] mb-2">
                  Cum să obții
                </span>
                <span className="block headline gradient-text">
                  analiză financiară de nivel CFO
                </span>
                <span className="block text-2xl md:text-3xl lg:text-4xl font-semibold text-[var(--newa-text-secondary)] mt-2">
                  în 30 de secunde, fără consultanți scumpi
                </span>
              </h1>
              
              <p className="body-large text-[var(--newa-text-secondary)] max-w-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                FinGuard transformă balanțele contabile în rapoarte detaliate, KPI-uri esențiale 
                și previziuni bugetare precise – automat și 100% confidențial.
              </p>
            </div>

            {/* CTAs with clear differentiation */}
            <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              {/* Primary CTA - Dominant */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/signup" className="btn-hero group inline-flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                  Analizează gratuit o balanță
                </Link>
                
                {/* Secondary CTA - Clearly different */}
                <button 
                  onClick={scrollToDemo}
                  className="btn-ghost group inline-flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  Vezi demo
                </button>
              </div>
              
              {/* Micro-copy for reassurance */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--newa-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[var(--newa-brand-accent-emerald)]" />
                  Fără card de credit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--newa-brand-accent-indigo)]" />
                  Rezultate în 30 secunde
                </span>
              </div>
            </div>

            {/* Trust Bar - Hidden on mobile for CTA visibility */}
            <div className="hidden sm:block animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <p className="text-small text-[var(--newa-text-muted)] mb-2">
                Peste 500 de companii românești folosesc FinGuard
              </p>
              <div className="flex items-center space-x-4 opacity-50">
                <div className="w-16 h-5 bg-[var(--newa-surface-canvas)] rounded-[var(--newa-radius-sm)] flex items-center justify-center">
                  <span className="text-[10px] font-medium text-[var(--newa-text-muted)]">COMPANY</span>
                </div>
                <div className="w-16 h-5 bg-[var(--newa-surface-canvas)] rounded-[var(--newa-radius-sm)] flex items-center justify-center">
                  <span className="text-[10px] font-medium text-[var(--newa-text-muted)]">BRAND</span>
                </div>
                <div className="w-16 h-5 bg-[var(--newa-surface-canvas)] rounded-[var(--newa-radius-sm)] flex items-center justify-center">
                  <span className="text-[10px] font-medium text-[var(--newa-text-muted)]">CORP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative animate-slide-in-right lg:mt-0 order-first lg:order-last">
            <div className="relative">
              <img 
                src={dashboardMockup}
                alt="FinGuard Dashboard - Analiză financiară automată"
                className="w-full h-auto rounded-[var(--newa-radius-xl)] shadow-xl"
              />
              
              {/* Floating Metric Cards - NEWA radius */}
              <div className="hidden md:block absolute -top-3 -left-3 bg-[var(--newa-surface-light)] p-3 rounded-[var(--newa-radius-xl)] shadow-md border border-[var(--newa-border-default)] float-animation">
                <div className="text-lg font-mono font-bold gradient-text">
                  {Math.round(counters.saved)}%
                </div>
                <div className="text-[10px] font-bold text-[var(--newa-text-muted)] uppercase tracking-widest">timp economisit</div>
              </div>

              <div className="hidden md:block absolute top-4 -right-4 bg-[var(--newa-surface-light)] p-3 rounded-[var(--newa-radius-xl)] shadow-md border border-[var(--newa-border-default)] float-animation" style={{ animationDelay: '0.5s' }}>
                <div className="text-lg font-mono font-bold gradient-text">
                  {Math.round(counters.kpis)}
                </div>
                <div className="text-[10px] font-bold text-[var(--newa-text-muted)] uppercase tracking-widest">KPI-uri calculate</div>
              </div>

              <div className="hidden md:block absolute -bottom-2 -left-4 bg-[var(--newa-surface-light)] p-3 rounded-[var(--newa-radius-xl)] shadow-md border border-[var(--newa-border-default)] float-animation" style={{ animationDelay: '1s' }}>
                <div className="text-lg font-mono font-bold gradient-text-success">
                  {counters.accuracy.toFixed(1)}%
                </div>
                <div className="text-[10px] font-bold text-[var(--newa-text-muted)] uppercase tracking-widest">acuratețe</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;