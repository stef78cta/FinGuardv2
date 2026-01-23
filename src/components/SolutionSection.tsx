import { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, Zap, BarChart3, ArrowRight } from 'lucide-react';

const SolutionSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Section visibility observer
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

  // Step visibility observer for scroll-based animation
  const handleStepVisibility = useCallback(() => {
    stepRefs.current.forEach((ref, index) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const threshold = viewportHeight * 0.6;
        
        if (rect.top < threshold && rect.bottom > threshold / 2) {
          setActiveStep(index);
          setProgressWidth(((index + 1) / 3) * 100);
        }
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleStepVisibility);
    handleStepVisibility(); // Initial check
    return () => window.removeEventListener('scroll', handleStepVisibility);
  }, [handleStepVisibility]);

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
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <h2 className="section-title text-gray-900 mb-4">
            FinGuard oferă claritate financiară instantanee
          </h2>
          <p className="body-large text-gray-600 max-w-2xl mx-auto">
            Încarcă balanța, primește analiză completă – simplu ca atât
          </p>
        </div>

        {/* Interactive Stepper */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between relative">
            {/* Background Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 -z-10 rounded-full"></div>
            
            {/* Animated Progress Line */}
            <div 
              className="absolute top-6 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 -z-10 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressWidth}%` }}
            ></div>
            
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;
              
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  {/* Step Circle with animation */}
                  <div 
                    className={`step-circle ${
                      isActive 
                        ? 'step-circle-active' 
                        : isCompleted 
                          ? 'step-circle-completed'
                          : 'step-circle-pending'
                    }`}
                  >
                    {step.number}
                  </div>
                  {/* Step Title */}
                  <div className={`flex items-center gap-1.5 mt-3 transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-50'
                  }`}>
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <p className={`text-xs font-semibold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Steps Content */}
        <div className="space-y-16">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isEven = index % 2 === 0;
            const isActive = index === activeStep;
            
            return (
              <div
                key={index}
                ref={(el) => (stepRefs.current[index] = el)}
                className={`grid lg:grid-cols-2 gap-8 items-center ${
                  !isEven ? 'lg:grid-flow-col-dense' : ''
                }`}
              >
                {/* Content */}
                <div 
                  className={`space-y-4 step-content ${
                    isVisible 
                      ? isActive 
                        ? 'step-content-active animate-fade-in-up' 
                        : 'step-content-pending animate-fade-in-up'
                      : 'opacity-0'
                  }`}
                  style={{ 
                    animationDelay: `${index * 0.3}s`,
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-white font-bold text-sm transition-all duration-500 ${
                      isActive 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg' 
                        : 'bg-gray-300'
                    }`}>
                      {step.number}
                    </div>
                    <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center transition-all duration-500 ${
                      isActive ? 'bg-indigo-50' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`w-5 h-5 transition-colors duration-500 ${
                        isActive ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                  
                  <h3 className={`text-xl font-bold transition-colors duration-500 ${
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h3>
                  
                  <p className={`body transition-colors duration-500 ${
                    isActive ? 'text-gray-600' : 'text-gray-400'
                  }`}>
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
                  <div className={`bg-gray-50 rounded-[20px] p-6 h-60 flex items-center justify-center border transition-all duration-500 ${
                    isActive ? 'border-indigo-200 shadow-lg' : 'border-gray-100'
                  }`}>
                    {step.visual === 'upload-interface' && (
                      <div className="w-full max-w-xs">
                        <div className={`border-2 border-dashed rounded-[16px] p-6 text-center transition-all duration-500 ${
                          isActive ? 'border-indigo-400 bg-indigo-50/70' : 'border-gray-300 bg-gray-50'
                        }`}>
                          <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors duration-500 ${
                            isActive ? 'text-indigo-500' : 'text-gray-400'
                          }`} />
                          <p className={`text-sm font-medium transition-colors duration-500 ${
                            isActive ? 'text-indigo-700' : 'text-gray-500'
                          }`}>Drag & Drop balanța aici</p>
                          <p className={`text-xs mt-1 transition-colors duration-500 ${
                            isActive ? 'text-indigo-600' : 'text-gray-400'
                          }`}>PDF, Excel, XLS</p>
                        </div>
                      </div>
                    )}

                    {step.visual === 'processing-animation' && (
                      <div className="space-y-3 w-full max-w-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          <div className="h-1.5 bg-gray-200 rounded-full flex-1">
                            <div className={`h-full rounded-full transition-all duration-1000 ${
                              isActive ? 'bg-indigo-500 w-3/4 animate-pulse' : 'bg-gray-300 w-1/4'
                            }`}></div>
                          </div>
                        </div>
                        <div className={`text-xs transition-colors duration-500 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                          Analizez KPI-urile...
                        </div>
                        <div className={`text-xs transition-colors duration-500 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                          Calculez previziunile...
                        </div>
                        <div className={`text-xs transition-colors duration-500 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                          Generez raportul...
                        </div>
                      </div>
                    )}

                    {step.visual === 'dashboard-results' && (
                      <div className="w-full max-w-xs space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`bg-white p-3 rounded-[16px] transition-shadow duration-500 ${
                            isActive ? 'shadow-md' : 'shadow-sm'
                          }`}>
                            <div className={`text-xl font-mono font-bold transition-colors duration-500 ${
                              isActive ? 'text-emerald-500' : 'text-gray-400'
                            }`}>87%</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lichiditate</div>
                          </div>
                          <div className={`bg-white p-3 rounded-[16px] transition-shadow duration-500 ${
                            isActive ? 'shadow-md' : 'shadow-sm'
                          }`}>
                            <div className={`text-xl font-mono font-bold transition-colors duration-500 ${
                              isActive ? 'text-indigo-600' : 'text-gray-400'
                            }`}>15</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KPI-uri</div>
                          </div>
                        </div>
                        <div className={`bg-white p-3 rounded-[16px] transition-shadow duration-500 ${
                          isActive ? 'shadow-md' : 'shadow-sm'
                        }`}>
                          <div className={`h-14 rounded-[12px] transition-all duration-500 ${
                            isActive 
                              ? 'bg-gradient-to-r from-indigo-400 to-purple-500 opacity-80' 
                              : 'bg-gray-200 opacity-50'
                          }`}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA with micro-copy */}
        <div className="text-center mt-14">
          <button className="btn-primary group inline-flex items-center">
            Începe analiza gratuită
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
          <p className="micro-copy">
            Fără card de credit • Rezultate în 30 de secunde
          </p>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;