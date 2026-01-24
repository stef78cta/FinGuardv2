import { useEffect, useRef, useState } from 'react';
import { Check, X, Zap, Shield, Lock, ArrowRight } from 'lucide-react';

const ComparisonSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, {
      threshold: 0.2
    });
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const comparisonData = [{
    feature: 'Timp de analiză',
    finGuard: '30 secunde',
    consultant: '2-5 zile',
    manual: '6+ ore'
  }, {
    feature: 'Cost lunar',
    finGuard: '49€',
    consultant: '800-2000€',
    manual: '€0 (dar timpul tău)'
  }, {
    feature: 'Disponibilitate',
    finGuard: '24/7 instant',
    consultant: 'Program limitat',
    manual: 'Când ai timp'
  }, {
    feature: 'Actualizare date',
    finGuard: 'Real-time',
    consultant: 'Lunar/trimestrial',
    manual: 'Manual când vrei'
  }, {
    feature: 'Previziuni AI',
    finGuard: true,
    consultant: false,
    manual: false
  }, {
    feature: 'Confidențialitate',
    finGuard: true,
    consultant: false,
    manual: true
  }];

  return (
    <section ref={sectionRef} className="section-padding bg-gradient-to-b from-[var(--newa-surface-canvas)] to-[var(--newa-surface-light)] relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--newa-brand-accent-indigo)]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--newa-brand-accent-emerald)]/5 rounded-full blur-3xl"></div>

      <div className="container-narrow relative z-10">
        {/* Header with proper hierarchy */}
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1.5 bg-[var(--newa-brand-accent-indigo)]/10 text-[var(--newa-brand-accent-indigo)] rounded-full text-xs font-semibold mb-4">
            Comparație
          </span>
          <h2 className="section-title text-[var(--newa-text-primary)] mb-4">
            De ce să alegi <span className="gradient-text">FinGuard</span>?
          </h2>
          <p className="body-large text-[var(--newa-text-secondary)] max-w-2xl mx-auto">
            Economisești timp, bani și obții rezultate profesionale instant
          </p>
        </div>

        {/* Comparison Cards Grid */}
        <div className={`grid md:grid-cols-3 gap-5 mb-10 transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {/* FinGuard Card - Featured */}
          <div className="bg-gradient-to-br from-[var(--newa-brand-accent-indigo)] via-[#4F46E5] to-purple-600 p-6 rounded-[var(--newa-radius-xl)] shadow-lg border-2 border-[var(--newa-brand-accent-indigo)]/20 relative overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--newa-surface-light)]/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-[var(--newa-surface-light)]/20 backdrop-blur-sm px-3 py-1.5 rounded-[40px] mb-4">
                <Zap className="w-3 h-3 text-[var(--newa-semantic-warning)]" />
                <span className="text-xs font-bold text-[var(--newa-text-inverse)]">Recomandat</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--newa-text-inverse)] mb-5">FinGuard</h3>
              
              {comparisonData.map((row, index) => (
                <div key={index} className="mb-3.5 pb-3.5 border-b border-[var(--newa-surface-light)]/10 last:border-0">
                  <div className="text-xs text-[var(--newa-text-inverse)]/70 mb-1">{row.feature}</div>
                  <div className="flex items-center justify-between">
                    {typeof row.finGuard === 'boolean' ? (
                      <div className="flex items-center justify-center w-full">
                        <Check className="w-5 h-5 text-[var(--newa-brand-accent-emerald)]" />
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-[var(--newa-text-inverse)]">{row.finGuard}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consultant Card */}
          <div className="bg-[var(--newa-surface-light)] p-6 rounded-[var(--newa-radius-xl)] shadow-sm border border-[var(--newa-border-default)] hover:shadow-md transition-all duration-300">
            <div className="inline-flex items-center gap-1.5 bg-[var(--newa-surface-canvas)] px-3 py-1.5 rounded-[40px] mb-4">
              <span className="text-xs font-bold text-[var(--newa-text-muted)]">Tradițional</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--newa-text-primary)] mb-5 whitespace-nowrap">Consultant Financiar</h3>
            
            {comparisonData.map((row, index) => (
              <div key={index} className="mb-3.5 pb-3.5 border-b border-[var(--newa-border-default)] last:border-0">
                <div className="text-xs text-[var(--newa-text-muted)] mb-1">{row.feature}</div>
                <div className="flex items-center justify-between">
                  {typeof row.consultant === 'boolean' ? (
                    <div className="flex items-center justify-center w-full">
                      {row.consultant ? (
                        <Check className="w-5 h-5 text-[var(--newa-text-muted)]" />
                      ) : (
                        <X className="w-5 h-5 text-[var(--newa-brand-danger-rose)]" />
                      )}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-[var(--newa-text-secondary)]">{row.consultant}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Manual Card */}
          <div className="bg-[var(--newa-surface-light)] p-6 rounded-[var(--newa-radius-xl)] shadow-sm border border-[var(--newa-border-default)] hover:shadow-md transition-all duration-300">
            <div className="inline-flex items-center gap-1.5 bg-[var(--newa-surface-canvas)] px-3 py-1.5 rounded-[40px] mb-4">
              <span className="text-xs font-bold text-[var(--newa-text-muted)]">Manual</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--newa-text-primary)] mb-5">Analiză Manuală</h3>
            
            {comparisonData.map((row, index) => (
              <div key={index} className="mb-3.5 pb-3.5 border-b border-[var(--newa-border-default)] last:border-0">
                <div className="text-xs text-[var(--newa-text-muted)] mb-1">{row.feature}</div>
                <div className="flex items-center justify-between">
                  {typeof row.manual === 'boolean' ? (
                    <div className="flex items-center justify-center w-full">
                      {row.manual ? (
                        <Check className="w-5 h-5 text-[var(--newa-text-muted)]" />
                      ) : (
                        <X className="w-5 h-5 text-[var(--newa-brand-danger-rose)]" />
                      )}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-[var(--newa-text-secondary)]">{row.manual}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits Summary */}
        <div className="bg-gradient-to-r from-[var(--newa-brand-accent-emerald)]/10 to-[var(--newa-brand-accent-indigo)]/10 rounded-[var(--newa-radius-xl)] p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--newa-brand-accent-emerald)]/20 rounded-[var(--newa-radius-lg)] mb-3">
                <Zap className="w-6 h-6 text-[var(--newa-brand-accent-emerald)]" />
              </div>
              <div className="text-2xl font-mono font-bold gradient-text-success mb-1">30 secunde</div>
              <div className="text-sm text-[var(--newa-text-secondary)]">Analiză completă vs. 2-5 zile</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--newa-brand-accent-indigo)]/20 rounded-[var(--newa-radius-lg)] mb-3">
                <Shield className="w-6 h-6 text-[var(--newa-brand-accent-indigo)]" />
              </div>
              <div className="text-2xl font-mono font-bold gradient-text mb-1">95%</div>
              <div className="text-sm text-[var(--newa-text-secondary)]">mai ieftin decât consultanți</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--newa-brand-accent-indigo)]/20 rounded-[var(--newa-radius-lg)] mb-3">
                <Lock className="w-6 h-6 text-[var(--newa-brand-accent-indigo)]" />
              </div>
              <div className="text-2xl font-mono font-bold gradient-text mb-1">100%</div>
              <div className="text-sm text-[var(--newa-text-secondary)]">confidențial și securizat</div>
            </div>
          </div>
        </div>

        {/* CTA Section with micro-copy */}
        <div className="text-center mt-10">
          <button className="btn-primary group inline-flex items-center">
            Începe analiza gratuită
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
          <p className="micro-copy">
            Nu este necesar card bancar • Rezultate în 30 de secunde
          </p>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;