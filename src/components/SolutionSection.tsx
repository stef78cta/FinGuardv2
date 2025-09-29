import { useEffect, useRef, useState } from 'react';
import { Upload, Zap, BarChart3 } from 'lucide-react';

const SolutionSection = () => {
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

  const steps = [
    {
      number: '01',
      icon: Upload,
      title: 'Încarcă documentele',
      description: 'Drag-and-drop balanța contabilă în format PDF, Excel sau XLS. Procesare securizată în cloud cu criptare end-to-end.',
      visual: 'upload-interface',
    },
    {
      number: '02',
      icon: Zap,
      title: 'IA procesează instant',
      description: 'Algoritmii noștri analizează datele, calculează 15+ KPI-uri critici și identifică tendințe financiare în sub 30 de secunde.',
      visual: 'processing-animation',
    },
    {
      number: '03',
      icon: BarChart3,
      title: 'Primești rapoarte acționabile',
      description: 'Dashboard interactiv cu rapoarte vizuale, recomandări personalizate și previziuni bugetare pe 6-12 luni.',
      visual: 'dashboard-results',
    },
  ];

  return (
    <section 
      id="demo"
      ref={sectionRef}
      className="section-padding bg-white relative overflow-hidden"
    >
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="container-narrow relative z-10">
        <div className="text-center mb-20">
          <h2 className="subheadline text-gray-900 mb-6">
            FinGuard oferă claritate financiară instantanee
          </h2>
          <p className="body-large text-gray-600 max-w-2xl mx-auto">
            Încarcă balanța, primește analiză completă – simplu ca atât
          </p>
        </div>

        <div className="space-y-20">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isEven = index % 2 === 0;
            
            return (
              <div
                key={index}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  !isEven ? 'lg:grid-flow-col-dense' : ''
                }`}
              >
                {/* Content */}
                <div 
                  className={`space-y-6 ${
                    isVisible 
                      ? 'animate-fade-in-up' 
                      : 'opacity-0'
                  }`}
                  style={{ 
                    animationDelay: `${index * 0.3}s`,
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {step.number}
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900">
                    {step.title}
                  </h3>
                  
                  <p className="body-large text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Visual Mockup */}
                <div 
                  className={`${!isEven ? 'lg:col-start-1' : ''} ${
                    isVisible 
                      ? 'animate-slide-in-right' 
                      : 'opacity-0'
                  }`}
                  style={{ 
                    animationDelay: `${index * 0.3 + 0.2}s`,
                  }}
                >
                  <div className="bg-gray-50 rounded-2xl p-8 h-80 flex items-center justify-center border border-gray-100">
                    {step.visual === 'upload-interface' && (
                      <div className="w-full max-w-sm">
                        <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-indigo-50/50">
                          <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                          <p className="text-indigo-700 font-medium">Drag & Drop balanța aici</p>
                          <p className="text-sm text-indigo-600 mt-2">PDF, Excel, XLS</p>
                        </div>
                      </div>
                    )}

                    {step.visual === 'processing-animation' && (
                      <div className="space-y-4 w-full max-w-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse"></div>
                          <div className="h-2 bg-gray-200 rounded-full flex-1">
                            <div className="h-full bg-indigo-500 rounded-full w-3/4 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">Analizez KPI-urile...</div>
                        <div className="text-sm text-gray-600">Calculez previziunile...</div>
                        <div className="text-sm text-gray-600">Generez raportul...</div>
                      </div>
                    )}

                    {step.visual === 'dashboard-results' && (
                      <div className="w-full max-w-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg shadow-soft">
                            <div className="text-2xl font-bold text-emerald-600">87%</div>
                            <div className="text-sm text-gray-600">Lichiditate</div>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-soft">
                            <div className="text-2xl font-bold text-indigo-600">15</div>
                            <div className="text-sm text-gray-600">KPI-uri</div>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-soft">
                          <div className="h-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded opacity-80"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <button className="btn-primary">
            Începe analiza gratuită
          </button>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;