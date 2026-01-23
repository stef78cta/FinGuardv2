import { useEffect, useRef, useState } from 'react';
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  Brain, 
  Smartphone, 
  Users 
} from 'lucide-react';

const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Features ordered by impact: high → medium → details
  const features = [
    // HIGH IMPACT - Top row with larger icons and highlight styling
    {
      icon: Zap,
      title: 'Analiză în 30 secunde',
      description: 'De la balanță brută la rapoarte complete mai rapid decât ai face cafeaua.',
      gradient: 'from-yellow-400 to-orange-500',
      isHighlight: true,
    },
    {
      icon: TrendingUp,
      title: '15+ KPI-uri esențiale',
      description: 'Lichiditate, profitabilitate, eficiență operațională – tot ce contează, calculat automat.',
      gradient: 'from-blue-400 to-indigo-500',
      isHighlight: true,
    },
    {
      icon: Brain,
      title: 'Previziuni AI',
      description: 'Scenarii bugetare pe 6-12 luni bazate pe pattern-urile tale financiare.',
      gradient: 'from-purple-400 to-pink-500',
      isHighlight: true,
    },
    // MEDIUM IMPACT - Standard styling
    {
      icon: Shield,
      title: '100% confidențial',
      description: 'Date criptate, fără acces terți, ștergere automată după 90 de zile.',
      gradient: 'from-emerald-400 to-teal-500',
      isHighlight: false,
    },
    {
      icon: Smartphone,
      title: 'Acces multi-device',
      description: 'Dashboard sincronizat pe web, mobile și tabletă – datele tale oriunde.',
      gradient: 'from-cyan-400 to-blue-500',
      isHighlight: false,
    },
    {
      icon: Users,
      title: 'Colaborare echipă',
      description: 'Acces controlat pentru CFO, contabil și consultant – fiecare cu permisiuni specifice.',
      gradient: 'from-rose-400 to-red-500',
      isHighlight: false,
    },
  ];

  return (
    <section 
      id="features"
      ref={sectionRef}
      className="section-padding bg-surface"
    >
      <div className="container-custom">
        {/* Header with proper hierarchy */}
        <div className="text-center mb-10">
          <h2 className="section-title text-slate-900 mb-4">
            Tot ce ai nevoie pentru control financiar complet
          </h2>
          <p className="body-large text-slate-600 max-w-2xl mx-auto">
            Funcționalități esențiale pentru analiza financiară profesională
          </p>
        </div>

        {/* Features Grid - First row highlighted */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const isHighlight = feature.isHighlight;
            
            return (
              <div
                key={index}
                className={`group cursor-pointer transform transition-all duration-700 ${
                  isVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-8 opacity-0'
                } ${
                  isHighlight 
                    ? 'card-feature-highlight' 
                    : 'card-feature'
                }`}
                style={{ 
                  transitionDelay: `${index * 0.1}s`
                }}
              >
                {/* Icon - Larger for highlighted items */}
                <div className={`bg-gradient-to-br ${feature.gradient} rounded-[16px] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${
                  isHighlight ? 'w-14 h-14' : 'w-12 h-12'
                }`}>
                  <IconComponent className={`text-white ${isHighlight ? 'w-7 h-7' : 'w-6 h-6'}`} />
                </div>
                
                {/* Title */}
                <h3 className={`font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors duration-300 ${
                  isHighlight ? 'text-lg' : 'text-base'
                }`}>
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="body text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;