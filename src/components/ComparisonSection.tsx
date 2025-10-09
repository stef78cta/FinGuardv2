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
    consultant: 'partial',
    manual: true
  }];
  const renderCell = (value: string | boolean, isFinGuard = false) => {
    if (typeof value === 'boolean') {
      return <div className="flex items-center justify-center">
        {value ? <Check className={`w-5 h-5 ${isFinGuard ? 'text-emerald-600' : 'text-gray-400'}`} /> : <X className="w-5 h-5 text-red-500" />}
      </div>;
    }
    if (value === 'partial') {
      return <span className="text-red-500 text-sm">Partajat</span>;
    }
    return <span className={`text-sm ${isFinGuard ? 'font-semibold text-emerald-600' : 'text-gray-600'}`}>
        {value}
      </span>;
  };
  return <section ref={sectionRef} className="section-padding-reduced bg-gradient-to-b from-surface to-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-indigo/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-emerald/5 rounded-full blur-3xl"></div>

      <div className="container-narrow relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-2 bg-primary-indigo/10 text-primary-indigo rounded-full text-sm font-semibold mb-4">
            Comparație
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            De ce să alegi <span className="gradient-text">FinGuard</span>?
          </h2>
          <p className="body-large text-text-secondary max-w-2xl mx-auto">
            Economisești timp, bani și obții rezultate profesionale instant
          </p>
        </div>

        {/* Comparison Cards Grid */}
        <div className={`grid md:grid-cols-3 gap-6 mb-12 transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {/* FinGuard Card - Featured */}
          <div className="bg-gradient-to-br from-primary-indigo via-primary-indigo-dark to-purple-600 p-8 rounded-2xl shadow-xl border-2 border-primary-indigo/20 relative overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-4">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-bold text-white">Recomandat</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-6">FinGuard</h3>
              
              {comparisonData.map((row, index) => (
                <div key={index} className="mb-4 pb-4 border-b border-white/10 last:border-0">
                  <div className="text-sm text-white/70 mb-1">{row.feature}</div>
                  <div className="flex items-center justify-between">
                    {typeof row.finGuard === 'boolean' ? (
                      <div className="flex items-center justify-center w-full">
                        <Check className="w-6 h-6 text-accent-emerald" />
                      </div>
                    ) : (
                      <div className="font-semibold text-white">{row.finGuard}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consultant Card */}
          <div className="bg-white p-8 rounded-2xl shadow-medium border border-border hover:shadow-large transition-all duration-300">
            <div className="inline-flex items-center gap-2 bg-surface px-3 py-1 rounded-full mb-4">
              <span className="text-sm font-semibold text-text-secondary">Tradițional</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-6">Consultant Financiar</h3>
            
            {comparisonData.map((row, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-border last:border-0">
                <div className="text-sm text-text-muted mb-1">{row.feature}</div>
                <div className="flex items-center justify-between">
                  {typeof row.consultant === 'boolean' ? (
                    <div className="flex items-center justify-center w-full">
                      <X className="w-6 h-6 text-destructive" />
                    </div>
                  ) : row.consultant === 'partial' ? (
                    <div className="font-medium text-destructive">Partajat</div>
                  ) : (
                    <div className="font-medium text-text-secondary">{row.consultant}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Manual Card */}
          <div className="bg-white p-8 rounded-2xl shadow-medium border border-border hover:shadow-large transition-all duration-300">
            <div className="inline-flex items-center gap-2 bg-surface px-3 py-1 rounded-full mb-4">
              <span className="text-sm font-semibold text-text-secondary">Manual</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-6">Analiză Manuală</h3>
            
            {comparisonData.map((row, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-border last:border-0">
                <div className="text-sm text-text-muted mb-1">{row.feature}</div>
                <div className="flex items-center justify-between">
                  {typeof row.manual === 'boolean' ? (
                    <div className="flex items-center justify-center w-full">
                      {row.manual ? (
                        <Check className="w-6 h-6 text-text-muted" />
                      ) : (
                        <X className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                  ) : (
                    <div className="font-medium text-text-secondary">{row.manual}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits Summary */}
        <div className="bg-gradient-to-r from-accent-emerald/10 to-primary-indigo/10 rounded-2xl p-8 md:p-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-emerald/20 rounded-2xl mb-4">
                <Zap className="w-8 h-8 text-accent-emerald" />
              </div>
              <div className="text-3xl font-bold gradient-text-success mb-2">30 secunde</div>
              <div className="text-text-secondary">Analiză completă vs. 2-5 zile</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-indigo/20 rounded-2xl mb-4">
                <Shield className="w-8 h-8 text-primary-indigo" />
              </div>
              <div className="text-3xl font-bold gradient-text mb-2">95%</div>
              <div className="text-text-secondary">mai ieftin decât consultanți</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-indigo/20 rounded-2xl mb-4">
                <Lock className="w-8 h-8 text-primary-indigo" />
              </div>
              <div className="text-3xl font-bold gradient-text mb-2">100%</div>
              <div className="text-text-secondary">confidențial și securizat</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <button className="btn-hero group inline-flex items-center">
            Începe analiza gratuită
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
          <p className="mt-4 text-sm text-text-muted">
            Nu este necesar card bancar • Rezultate în 30 de secunde
          </p>
        </div>
      </div>
    </section>;
};
export default ComparisonSection;