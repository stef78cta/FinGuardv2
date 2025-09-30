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

  const features = [
    {
      icon: Zap,
      title: 'Analiză în 30 secunde',
      description: 'De la balanță brută la rapoarte complete mai rapid decât ai face cafeaua.',
      gradient: 'from-yellow-400 to-orange-500',
    },
    {
      icon: Shield,
      title: '100% confidențial',
      description: 'Date criptate, fără acces terți, ștergere automată după 90 de zile.',
      gradient: 'from-emerald-400 to-teal-500',
    },
    {
      icon: TrendingUp,
      title: '15+ KPI-uri esențiale',
      description: 'Lichiditate, profitabilitate, eficiență operațională – tot ce contează, calculat automat.',
      gradient: 'from-blue-400 to-indigo-500',
    },
    {
      icon: Brain,
      title: 'Previziuni AI',
      description: 'Scenarii bugetare pe 6-12 luni bazate pe pattern-urile tale financiare.',
      gradient: 'from-purple-400 to-pink-500',
    },
    {
      icon: Smartphone,
      title: 'Acces multi-device',
      description: 'Dashboard sincronizat pe web, mobile și tabletă – datele tale oriunde.',
      gradient: 'from-cyan-400 to-blue-500',
    },
    {
      icon: Users,
      title: 'Colaborare echipă',
      description: 'Acces controlat pentru CFO, contabil și consultant – fiecare cu permisiuni specifice.',
      gradient: 'from-rose-400 to-red-500',
    },
  ];

  return (
    <section 
      id="features"
      ref={sectionRef}
      className="section-padding-reduced bg-surface"
    >
      <div className="container-custom">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="subheadline text-gray-900 mb-6">
            Tot ce ai nevoie pentru control financiar complet
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            
            return (
              <div
                key={index}
                className={`card-feature group cursor-pointer transform transition-all duration-700 ${
                  isVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-8 opacity-0'
                }`}
                style={{ 
                  transitionDelay: `${index * 0.1}s`
                }}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="body text-gray-600 leading-relaxed">
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