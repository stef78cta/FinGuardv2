import { useEffect, useRef, useState } from 'react';
import { Check, ArrowRight, Phone, Sparkles, Shield, Lock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type BillingCycle = 'monthly' | 'yearly';

const PricingSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [billing, setBilling] = useState<BillingCycle>('monthly');
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

  // Plan configuration — Starter & Enterprise păstrate în cod, ascunse (hidden = true)
  const plans = [
    {
      name: 'Starter',
      planKey: 'starter',
      hidden: true,
      price: 'Gratuit',
      badge: 'Perfect pentru început',
      badgeColor: 'bg-[var(--newa-surface-canvas)] text-[var(--newa-text-secondary)]',
      features: ['3 analize/lună', '10 KPI-uri de bază', 'Export PDF', 'Suport email'],
      cta: 'Începe gratuit',
      ctaStyle: 'btn-ghost',
      popular: false,
    },
    {
      name: 'Professional',
      planKey: 'professional',
      hidden: false,
      pricing: {
        monthly: { amount: '20€', period: '/lună per companie', note: null as string | null },
        yearly: { amount: '200€', period: '/an per companie', note: '2 luni bonus' },
      },
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
      cta: 'Începe perioada gratuită',
      ctaStyle: 'btn-hero',
      popular: true,
    },
    {
      name: 'Enterprise',
      planKey: 'enterprise',
      hidden: true,
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

  const visiblePlans = plans.filter((p) => !p.hidden);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="section-padding bg-[var(--newa-surface-light)]"
    >
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="section-title text-[var(--newa-text-primary)] mb-4">
            Prețuri simple, fără surprize
          </h2>
          <p className="body-large text-[var(--newa-text-secondary)] max-w-2xl mx-auto">
            Începe gratuit, scalează când ești gata
          </p>
        </div>

        {/* Billing toggle — segmented control */}
        <div className="flex justify-center mb-10">
          <div
            role="tablist"
            aria-label="Ciclu de facturare"
            className="relative inline-flex items-center bg-[var(--newa-surface-light)] border border-[var(--newa-border-default)] rounded-full p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <span
              aria-hidden="true"
              className={`absolute top-1 bottom-1 rounded-full bg-[var(--newa-brand-accent-indigo)] shadow-[0_4px_12px_rgba(99,102,241,0.35)] transition-all duration-300 ease-out ${
                billing === 'monthly'
                  ? 'left-1 right-[calc(50%+2px)]'
                  : 'left-[calc(50%+2px)] right-1'
              }`}
            />
            <button
              type="button"
              role="tab"
              aria-selected={billing === 'monthly'}
              onClick={() => setBilling('monthly')}
              className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${
                billing === 'monthly'
                  ? 'text-[var(--newa-text-inverse)]'
                  : 'text-[var(--newa-text-secondary)] hover:text-[var(--newa-text-primary)]'
              }`}
            >
              Lunar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={billing === 'yearly'}
              onClick={() => setBilling('yearly')}
              className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-full transition-colors duration-300 inline-flex items-center gap-2 ${
                billing === 'yearly'
                  ? 'text-[var(--newa-text-inverse)]'
                  : 'text-[var(--newa-text-secondary)] hover:text-[var(--newa-text-primary)]'
              }`}
            >
              Anual
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full transition-colors duration-300 ${
                  billing === 'yearly'
                    ? 'bg-[var(--newa-brand-accent-emerald)] text-[var(--newa-brand-primary-dark)]'
                    : 'bg-[var(--newa-brand-accent-emerald)]/15 text-[var(--newa-brand-accent-emerald)]'
                }`}
              >
                −2 luni
              </span>
            </button>
          </div>
        </div>


        {/* Single centered plan card */}
        <div className="flex justify-center">
          {visiblePlans.map((plan, index) => {
            const active = plan.pricing?.[billing];
            return (
              <div
                key={plan.planKey}
                className={`relative w-full max-w-[460px] transform transition-all duration-700 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                } ${plan.popular ? 'card-pricing-featured' : 'card-pricing'}`}
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-[var(--newa-brand-accent-indigo)] to-purple-600 text-[var(--newa-text-inverse)] px-4 py-1.5 rounded-[40px] text-xs font-bold shadow-md">
                      Recomandat
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <div
                    className={`inline-block px-3 py-1 rounded-[40px] text-xs font-bold mb-3 ${plan.badgeColor}`}
                  >
                    {plan.badge}
                  </div>

                  <h3 className="text-xl font-bold text-[var(--newa-text-primary)] mb-1">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-6 mt-4">
                    {active ? (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-mono font-bold gradient-text leading-none">
                          {active.amount}
                        </span>
                        <span className="text-sm text-[var(--newa-text-secondary)]">
                          {active.period}
                        </span>
                      </div>
                    ) : (
                      <span className="text-3xl font-mono font-bold text-[var(--newa-brand-primary-dark)]">
                        {plan.price}
                      </span>
                    )}
                    {active?.note && (
                      <div className="mt-2">
                        <span className="inline-block text-xs font-semibold text-[var(--newa-brand-accent-emerald)] bg-[var(--newa-brand-accent-emerald)]/10 px-2.5 py-1 rounded-[40px]">
                          {active.note}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 text-left">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--newa-brand-accent-emerald)]/15 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-[var(--newa-brand-accent-emerald)]" strokeWidth={3} />
                        </span>
                        <span className="text-sm text-[var(--newa-text-secondary)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    to={`/signup?plan=${plan.planKey}&billing=${billing}`}
                    className={`w-full ${plan.ctaStyle} group flex items-center justify-center`}
                  >
                    {plan.name === 'Enterprise' ? (
                      <Phone className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                    )}
                    {plan.cta}
                  </Link>

                  {plan.popular && (
                    <p className="micro-copy">Anulare oricând, fără costuri ascunse</p>
                  )}
                </div>
              </div>
            );
          })}
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

        {/* Guarantee notice */}
        <div className="max-w-3xl mx-auto mt-6">
          <div className="flex items-start gap-3 bg-[var(--newa-selection-bg)]/40 border border-[var(--newa-border-default)] rounded-[var(--newa-radius-xl)] px-5 py-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-[var(--newa-radius-lg)] bg-[var(--newa-brand-accent-indigo)]/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[var(--newa-brand-accent-indigo)]" />
            </div>
            <p className="text-xs md:text-sm text-[var(--newa-text-secondary)] leading-relaxed text-left">
              <span className="font-semibold text-[var(--newa-text-primary)]">
                Garanția „Înțelegi sau nu plătești”:
              </span>{' '}
              Dacă, în termen de 3 zile de la primirea raportului, nu ai o imagine clară asupra
              performanței și riscurilor afacerii tale, îți returnăm cei 20 €. Simplu. Fără explicații.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
