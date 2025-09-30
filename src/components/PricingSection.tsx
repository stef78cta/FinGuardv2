import { useEffect, useRef, useState } from 'react';
import { Check, ArrowRight, Phone } from 'lucide-react';

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
      price: 'Gratuit',
      badge: 'Perfect pentru început',
      badgeColor: 'bg-gray-100 text-gray-700',
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
      price: '49€',
      period: '/lună',
      badge: 'Cel mai popular',
      badgeColor: 'bg-indigo-100 text-indigo-700',
      features: [
        'Analize nelimitate',
        '15+ KPI-uri avansate',
        'Previziuni AI 6 luni',
        'Export Excel + PDF',
        'Colaborare echipă (3 useri)',
        'Suport prioritar',
      ],
      cta: 'Începe perioada gratuită',
      ctaStyle: 'btn-hero',
      popular: true,
    },
    {
      name: 'Enterprise',
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
      className="section-padding-reduced bg-white"
    >
      <div className="container-custom">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="subheadline text-gray-900 mb-6">
            Prețuri simple, fără surprize
          </h2>
          <p className="body-large text-gray-600 max-w-2xl mx-auto">
            Începe gratuit, scalează când ești gata
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative transform transition-all duration-700 ${
                isVisible 
                  ? 'translate-y-0 opacity-100' 
                  : 'translate-y-8 opacity-0'
              } ${
                plan.popular 
                  ? 'card-pricing-featured scale-105 lg:scale-110' 
                  : 'card-pricing'
              }`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Recomandat
                  </div>
                </div>
              )}

              <div className="text-center">
                {/* Plan Badge */}
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${plan.badgeColor}`}>
                  {plan.badge}
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-8">
                  <span className={`text-4xl font-bold ${plan.popular ? 'gradient-text' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-lg text-gray-600">{plan.period}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8 text-left">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="body text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button className={`w-full ${plan.ctaStyle} group`}>
                  {plan.cta}
                  {plan.name === 'Enterprise' ? (
                    <Phone className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform duration-200" />
                  ) : (
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Elements */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-6 text-sm text-gray-500 bg-gray-50 px-6 py-3 rounded-2xl">
            <span className="flex items-center space-x-2">
              <span>💳</span>
              <span>Fără card necesar pentru trial</span>
            </span>
            <span className="flex items-center space-x-2">
              <span>❌</span>
              <span>Anulare oricând</span>
            </span>
            <span className="flex items-center space-x-2">
              <span>🔒</span>
              <span>Plată securizată Stripe</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;