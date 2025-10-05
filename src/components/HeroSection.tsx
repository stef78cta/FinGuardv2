import { useEffect, useRef, useState } from 'react';
import { Play, ArrowRight } from 'lucide-react';
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
      className="relative min-h-screen flex items-center justify-center section-padding-reduced overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-full blur-3xl"></div>

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 animate-fade-in-up leading-tight">
                Cum să obții 
                <span className="gradient-text block">
                  analiză financiară de nivel CFO
                </span>
                în 30 de secunde, fără consultanți scumpi
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
                FinGuard transformă balanțele contabile în rapoarte detaliate, KPI-uri esențiale 
                și previziuni bugetare precise – automat și 100% confidențial.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <button className="btn-hero group">
                Analizează gratuit o balanță de verificare
              </button>
              
              <button 
                onClick={scrollToDemo}
                className="btn-ghost group inline-flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                Vezi analiză demo
              </button>
            </div>

            {/* Trust Bar */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <p className="text-small text-gray-500 mb-4">
                Peste 500 de companii românești folosesc FinGuard zilnic
              </p>
              <div className="flex items-center space-x-8 opacity-60">
                <div className="w-24 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500">COMPANY</span>
                </div>
                <div className="w-24 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500">BRAND</span>
                </div>
                <div className="w-24 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500">CORP</span>
                </div>
                <div className="w-24 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500">FIRM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative animate-slide-in-right mt-12 lg:mt-0">
            <div className="relative">
              <img 
                src={dashboardMockup}
                alt="FinGuard Dashboard - Analiză financiară automată"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              
              {/* Floating Metric Cards */}
              <div className="hidden md:block absolute -top-6 -left-6 bg-white p-4 rounded-xl shadow-large border border-gray-100 float-animation">
                <div className="text-2xl font-bold gradient-text">
                  {Math.round(counters.saved)}%
                </div>
                <div className="text-sm text-gray-600">timp economisit</div>
              </div>

              <div className="hidden md:block absolute top-8 -right-8 bg-white p-4 rounded-xl shadow-large border border-gray-100 float-animation" style={{ animationDelay: '0.5s' }}>
                <div className="text-2xl font-bold gradient-text">
                  {Math.round(counters.kpis)}
                </div>
                <div className="text-sm text-gray-600">KPI-uri calculate</div>
              </div>

              <div className="hidden md:block absolute -bottom-4 -left-8 bg-white p-4 rounded-xl shadow-large border border-gray-100 float-animation" style={{ animationDelay: '1s' }}>
                <div className="text-2xl font-bold gradient-text-success">
                  {counters.accuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">acuratețe</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;