import { useEffect, useRef, useState } from 'react';
import { Check, ArrowRight, Phone, Sparkles, Shield, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const PricingSection = () => {
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

  const plans = [
    {
      name: 'Starter',
      planKey: 'starter',
      price: 'Gratuit',
      badge: 'Perfect pentru început',
      badgeColor: 'bg-[var(--newa-surface-canvas)] text-[var(--newa-text-secondary)]',
      features: [
        '3 analize/lună',
        '10 KPI-uri de bază',
        'Export PDF',
        'Suport email',
      ],
      cta: 'Începe gratuit',
      ctaStyle: 'btn-ghost',
      popular: false,
    },
    {
      name: 'Professional',
      planKey: 'professional',
      price: '49€',
      period: '/lună',
      badge: 'Cel mai popular',
      badgeColor: 'bg-[var(--newa-selection-bg)] text-[var(--newa-brand-accent-indigo)]',
      features: [
        'Analize nelimitate',
        '15+ KPI-uri avansate',
        'Previziuni AI 6 luni',
        'Export Excel + PDF',
        'Colaborare echipă (3 useri)',
        'Suport prioritar',
      ],
      cta: 'Începe perioada gratuită (14 zile)',
      ctaStyle: 'btn-hero',
      popular: true,
    },
    {
      name: 'Enterprise',
      planKey: 'enterprise',
      price: 'Custom',
      badge: 'Pentru firme de contabilitate',
      badgeColor: 'bg-purple-100 text-purple-700',
      features: [
        'Tot din Professional +',
        'Clienți nelimitați',
        'White-label disponibil',
        'API access',
        'Manager de cont dedicat',
        'SLA 99.9%',
      ],
      cta: 'Contactează vânzări',
      ctaStyle: 'btn-secondary',
      popular: false,
    },
  ];

  return (
    <section 
      id="pricing"
      ref={sectionRef}
      className="section-padding bg-[var(--newa-surface-light)]"
    >
      <div className="container-custom">
        {/* Header with proper hierarchy */}
        <div className="text-center mb-10">
          <h2 className="section-title text-[var(--newa-text-primary)] mb-4">
            Prețuri simple, fără surprize
          </h2>
          <p className="body-large text-[var(--newa-text-secondary)] max-w-2xl mx-auto">
            Începe gratuit, scalează când ești gata
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative transform transition-all duration-700 ${
                isVisible 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-8 opacity-0'
              } ${
                plan.popular 
                  ? 'card-pricing-featured scale-[1.03] lg:scale-105' 
                  : 'card-pricing'
              }`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-[var(--newa-brand-accent-indigo)] to-purple-600 text-[var(--newa-text-inverse)] px-4 py-1.5 rounded-[40px] text-xs font-bold shadow-md">
                    Recomandat
                  </div>
                </div>
              )}

              <div className="text-center">
                {/* Plan Badge */}
                <div className={`inline-block px-3 py-1 rounded-[40px] text-xs font-bold mb-3 ${plan.badgeColor}`}>
                  {plan.badge}
                </div>

                {/* Plan Name */}
                <h3 className="text-xl font-bold text-[var(--newa-text-primary)] mb-1">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <span className={`text-3xl font-mono font-bold ${plan.popular ? 'gradient-text' : 'text-[var(--newa-brand-primary-dark)]'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-base text-[var(--newa-text-secondary)]">{plan.period}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 text-left">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-[var(--newa-brand-accent-emerald)] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-[var(--newa-text-secondary)]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA with differentiated styling */}
                <Link 
                  to={`/signup?plan=${plan.planKey}`}
                  className={`w-full ${plan.ctaStyle} group flex items-center justify-center`}
                >
                  {plan.name === 'Enterprise' ? (
                    <Phone className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                  )}
                  {plan.cta}
                </Link>
                
                {/* Micro-copy for popular plan */}
                {plan.popular && (
                  <p className="micro-copy">
                    Anulare oricând, fără costuri ascunse
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Trust & Reassurance Bar */}
        <div className="text-center mt-14">
          <div className="inline-flex flex-wrap items-center justify-center gap-6 lg:gap-8 bg-gradient-to-r from-[var(--newa-surface-canvas)] via-[var(--newa-surface-light)] to-[var(--newa-surface-canvas)] px-6 lg:px-8 py-5 rounded-[var(--newa-radius-xl)] border border-[var(--newa-border-default)] shadow-sm">
            <div className="flex items-center gap-2 group">
              <div className="flex-shrink-0 w-10 h-10 bg-[var(--newa-alert-success-bg)] rounded-[var(--newa-radius-lg)] flex items-center justify-center group-hover:opacity-80 transition-opacity duration-300">
                <Sparkles className="w-5 h-5 text-[var(--newa-brand-accent-emerald)]" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-[var(--newa-brand-primary-dark)] text-sm">Start Instant Fără Card</div>
                <div className="text-xs text-[var(--newa-text-muted)]">Activare în 30 secunde</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 group">
              <div className="flex-shrink-0 w-10 h-10 bg-[var(--newa-alert-info-bg)] rounded-[var(--newa-radius-lg)] flex items-center justify-center group-hover:opacity-80 transition-opacity duration-300">
                <Shield className="w-5 h-5 text-[var(--newa-semantic-info)]" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-[var(--newa-brand-primary-dark)] text-sm">Anulare Instant 100%</div>
                <div className="text-xs text-[var(--newa-text-muted)]">Zero întrebări, zero taxe</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 group">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-[var(--newa-radius-lg)] flex items-center justify-center group-hover:opacity-80 transition-opacity duration-300">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-[var(--newa-brand-primary-dark)] text-sm">Securitate Bancară</div>
                <div className="text-xs text-[var(--newa-text-muted)]">Encriptare SSL 256-bit</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;