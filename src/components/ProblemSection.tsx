import { useEffect, useRef, useState } from 'react';
import { Clock, FileX, DollarSign } from 'lucide-react';

const ProblemSection = () => {
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

  const problems = [
    {
      icon: Clock,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      title: '48+ ore pe lună pierdute',
      description: 'Compilarea manuală a rapoartelor financiare consumă timpul pe care l-ai putea investi în dezvoltarea afacerii.',
    },
    {
      icon: FileX,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      title: 'Erori costisitoare umane',
      description: 'O singură greșeală de calcul poate duce la decizii financiare greșite care afectează cashflow-ul companiei.',
    },
    {
      icon: DollarSign,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      title: '5.000€+ consultanță/an',
      description: 'Serviciile de analiză financiară tradiționale sunt accesibile doar companiilor mari, lasând IMM-urile fără suport.',
    },
  ];

  return (
    <section 
      ref={sectionRef}
      className="section-padding bg-gradient-to-b from-white to-surface"
    >
      <div className="container-narrow">
        {/* Header with proper hierarchy */}
        <div className="text-center mb-10">
          <h2 className="section-title text-gray-900 mb-4">
            Cunosc frustrarea: zile întregi consumate de analiza manuală
          </h2>
          <p className="body-large text-gray-600 max-w-2xl mx-auto">
            Probleme pe care le întâlnesc zilnic antreprenorii și contabilii
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <div
                key={index}
                className={`card-feature text-center transform transition-all duration-700 ${
                  isVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-8 opacity-0'
                }`}
                style={{ 
                  animationDelay: `${index * 0.2}s`,
                  transitionDelay: `${index * 0.1}s`
                }}
              >
                <div className={`w-14 h-14 ${problem.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <IconComponent className={`w-7 h-7 ${problem.iconColor}`} />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {problem.title}
                </h3>
                
                <p className="body text-gray-600">
                  {problem.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;