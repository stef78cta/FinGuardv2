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
      className="section-padding bg-[var(--newa-surface-light)] relative overflow-hidden"
    >
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="container-narrow relative z-10">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <h2 className="section-title text-[var(--newa-text-primary)] mb-4">
            FinGuard oferă claritate financiară instantanee
          </h2>
          <p className="body-large text-[var(--newa-text-secondary)] max-w-2xl mx-auto">
            Încarcă balanța, primește analiză completă – simplu ca atât
          </p>
        </div>

        {/* Interactive Stepper */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between relative">
            {/* Background Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-[var(--newa-border-default)] -z-10 rounded-full"></div>
            
            {/* Animated Progress Line */}
            <div 
              className="absolute top-6 left-0 h-1 bg-gradient-to-r from-[var(--newa-brand-accent-indigo)] to-purple-600 -z-10 rounded-full transition-all duration-700 ease-out"
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
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-[var(--newa-brand-accent-indigo)]' : 'text-[var(--newa-text-muted)]'}`} />
                    <p className={`text-xs font-semibold ${isActive ? 'text-[var(--newa-text-primary)]' : 'text-[var(--newa-text-muted)]'}`}>
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
                    <div className={`w-12 h-12 rounded-[var(--newa-radius-lg)] flex items-center justify-center text-[var(--newa-text-inverse)] font-bold text-sm transition-all duration-500 ${
                      isActive 
                        ? 'bg-gradient-to-r from-[var(--newa-brand-accent-indigo)] to-purple-600 shadow-lg' 
                        : 'bg-[var(--newa-border-default)]'
                    }`}>
                      {step.number}
                    </div>
                    <div className={`w-10 h-10 rounded-[var(--newa-radius-lg)] flex items-center justify-center transition-all duration-500 ${
                      isActive ? 'bg-[var(--newa-selection-bg)]' : 'bg-[var(--newa-surface-canvas)]'
                    }`}>
                      <IconComponent className={`w-5 h-5 transition-colors duration-500 ${
                        isActive ? 'text-[var(--newa-brand-accent-indigo)]' : 'text-[var(--newa-text-muted)]'
                      }`} />
                    </div>
                  </div>
                  
                  <h3 className={`text-xl font-bold transition-colors duration-500 ${
                    isActive ? 'text-[var(--newa-text-primary)]' : 'text-[var(--newa-text-muted)]'
                  }`}>
                    {step.title}
                  </h3>
                  
                  <p className={`body transition-colors duration-500 ${
                    isActive ? 'text-[var(--newa-text-secondary)]' : 'text-[var(--newa-text-muted)]'
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
                  <div className={`bg-[var(--newa-surface-canvas)] rounded-[var(--newa-radius-xl)] p-6 h-60 flex items-center justify-center border transition-all duration-500 ${
                    isActive ? 'border-[var(--newa-brand-accent-indigo)]/30 shadow-lg' : 'border-[var(--newa-border-default)]'
                  }`}>
                    {step.visual === 'upload-interface' && (
                      <div className="w-full max-w-xs">
                        <div className={`border-2 border-dashed rounded-[var(--newa-radius-lg)] p-6 text-center transition-all duration-500 ${
                          isActive ? 'border-[var(--newa-brand-accent-indigo)] bg-[var(--newa-selection-bg)]/70' : 'border-[var(--newa-border-default)] bg-[var(--newa-surface-canvas)]'
                        }`}>
                          <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors duration-500 ${
                            isActive ? 'text-[var(--newa-brand-accent-indigo)]' : 'text-[var(--newa-text-muted)]'
                          }`} />
                          <p className={`text-sm font-medium transition-colors duration-500 ${
                            isActive ? 'text-[var(--newa-brand-accent-indigo)]' : 'text-[var(--newa-text-muted)]'
                          }`}>Drag & Drop balanța aici</p>
                          <p className={`text-xs mt-1 transition-colors duration-500 ${
                            isActive ? 'text-[var(--newa-brand-accent-indigo)]' : 'text-[var(--newa-text-muted)]'
                          }`}>PDF, Excel, XLS</p>
                        </div>
                      </div>
                    )}

                    {step.visual === 'processing-animation' && (
                      <div className="space-y-3 w-full max-w-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-[var(--newa-brand-accent-indigo)] animate-pulse' : 'bg-[var(--newa-border-default)]'}`}></div>
                          <div className="h-1.5 bg-[var(--newa-border-default)] rounded-full flex-1">
                            <div className={`h-full rounded-full transition-all duration-1000 ${
                              isActive ? 'bg-[var(--newa-brand-accent-indigo)] w-3/4 animate-pulse' : 'bg-[var(--newa-border-default)] w-1/4'
                            }`}></div>
                          </div>
                        </div>
                        <div className={`text-xs transition-colors duration-500 ${isActive ? 'text-[var(--newa-text-secondary)]' : 'text-[var(--newa-text-muted)]'}`}>
                          Analizez KPI-urile...
                        </div>
                        <div className={`text-xs transition-colors duration-500 ${isActive ? 'text-[var(--newa-text-secondary)]' : 'text-[var(--newa-text-muted)]'}`}>
                          Calculez previziunile...
                        </div>
                        <div className={`text-xs transition-colors duration-500 ${isActive ? 'text-[var(--newa-text-secondary)]' : 'text-[var(--newa-text-muted)]'}`}>
                          Generez raportul...
                        </div>
                      </div>
                    )}

                    {step.visual === 'dashboard-results' && (
                      <div className="w-full max-w-xs space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`bg-[var(--newa-surface-light)] p-3 rounded-[var(--newa-radius-lg)] transition-shadow duration-500 ${
                            isActive ? 'shadow-md' : 'shadow-sm'
                          }`}>
                            <div className={`text-xl font-mono font-bold transition-colors duration-500 ${
                              isActive ? 'text-[var(--newa-brand-accent-emerald)]' : 'text-[var(--newa-text-muted)]'
                            }`}>87%</div>
                            <div className="text-[10px] font-bold text-[var(--newa-text-muted)] uppercase tracking-widest">Lichiditate</div>
                          </div>
                          <div className={`bg-[var(--newa-surface-light)] p-3 rounded-[var(--newa-radius-lg)] transition-shadow duration-500 ${
                            isActive ? 'shadow-md' : 'shadow-sm'
                          }`}>
                            <div className={`text-xl font-mono font-bold transition-colors duration-500 ${
                              isActive ? 'text-[var(--newa-brand-accent-indigo)]' : 'text-[var(--newa-text-muted)]'
                            }`}>15</div>
                            <div className="text-[10px] font-bold text-[var(--newa-text-muted)] uppercase tracking-widest">KPI-uri</div>
                          </div>
                        </div>
                        <div className={`bg-[var(--newa-surface-light)] p-3 rounded-[var(--newa-radius-lg)] transition-shadow duration-500 ${
                          isActive ? 'shadow-md' : 'shadow-sm'
                        }`}>
                          <div className={`h-14 rounded-[var(--newa-radius-md)] transition-all duration-500 ${
                            isActive 
                              ? 'bg-gradient-to-r from-[var(--newa-brand-accent-indigo)] to-purple-500 opacity-80' 
                              : 'bg-[var(--newa-border-default)] opacity-50'
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