import { useState } from 'react';
import PageShell from '@/components/marketing/PageShell';
import { 
  Briefcase, 
  GraduationCap, 
  Users, 
  Zap,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Code,
  Palette,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Careers = () => {
  const [openRole, setOpenRole] = useState<string | null>(null);

  const benefits = [
    {
      icon: Briefcase,
      title: 'Flexibilitate',
      description: 'Lucru remote sau hibrid, program adaptat la nevoile tale.',
    },
    {
      icon: GraduationCap,
      title: 'Buget de învățare',
      description: 'Cursuri, conferințe și resurse pentru dezvoltare continuă.',
    },
    {
      icon: Users,
      title: 'Echipă mică',
      description: 'Colaborare directă, fără birocrație, decizii rapide.',
    },
    {
      icon: Zap,
      title: 'Impact real',
      description: 'Munca ta ajunge la utilizatori și face diferență.',
    },
  ];

  const roles = [
    {
      id: 'fullstack',
      icon: Code,
      title: 'Full-Stack Engineer',
      subtitle: 'TypeScript / React / Node.js',
      description: 'Construiești și îmbunătățești platforma FinGuard, de la UI la API.',
      requirements: [
        'Experiență solidă cu TypeScript și React',
        'Familiaritate cu Node.js sau alt backend',
        'Înțelegerea bazelor de date relaționale (PostgreSQL)',
        'Abilitatea de a lucra autonom și de a comunica clar',
        'Bonus: experiență cu Supabase, tRPC sau sisteme financiare',
      ],
    },
    {
      id: 'data',
      icon: Briefcase,
      title: 'Data / Analytics Engineer',
      subtitle: 'SQL / Python / Pipeline-uri de date',
      description: 'Proiectezi și implementezi fluxurile de date care alimentează rapoartele financiare.',
      requirements: [
        'SQL avansat și modelare date',
        'Experiență cu ETL/ELT și pipeline-uri de date',
        'Python sau alt limbaj pentru automatizare',
        'Înțelegerea conceptelor de contabilitate și raportare este un plus',
        'Bonus: experiență cu dbt, Airflow sau instrumente similare',
      ],
    },
    {
      id: 'designer',
      icon: Palette,
      title: 'Product Designer',
      subtitle: 'Sisteme de design / UX pentru B2B',
      description: 'Creezi experiențe clare și eficiente pentru profesioniști financiari.',
      requirements: [
        'Portfolio cu proiecte B2B sau enterprise',
        'Experiență cu sisteme de design și component libraries',
        'Abilitatea de a traduce cerințe complexe în interfețe simple',
        'Figma sau instrumente similare',
        'Bonus: experiență cu produse financiare sau tabele de date complexe',
      ],
    },
  ];

  const processSteps = [
    {
      step: '1',
      title: 'Discuție inițială',
      description: 'Conversație de 30 minute pentru a ne cunoaște și a înțelege așteptările.',
    },
    {
      step: '2',
      title: 'Probă practică',
      description: 'Exercițiu scurt, relevant pentru rol, pe care îl discutăm împreună.',
    },
    {
      step: '3',
      title: 'Ofertă',
      description: 'Dacă e potrivire, facem o ofertă clară și negociem detaliile.',
    },
  ];

  return (
    <PageShell
      title="Cariere"
      heroTitle="Construim produse pentru finanțe, cu grijă pentru detalii"
      heroSubtitle="Căutăm oameni care înțeleg impactul datelor corecte."
    >
      {/* De ce la noi */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-6">De ce să lucrezi la FinGuard</h2>
        <div className="space-y-4 body-large text-[var(--newa-text-secondary)]">
          <p>
            Construim un produs care rezolvă probleme reale pentru echipe financiare. Nu este încă un alt SaaS 
            generic — este un instrument specializat, gândit pentru profesioniști care lucrează cu date sensibile 
            și au nevoie de acuratețe.
          </p>
          <p>
            Suntem o echipă mică unde fiecare om contează. Deciziile se iau rapid, ideile bune ajung în producție 
            în zile, nu luni. Îți vei vedea contribuția direct în produs.
          </p>
          <p>
            Prețuim calitatea peste viteză brută. Preferăm să facem puține lucruri bine decât multe lucruri 
            superficial. Codul trebuie să fie mentenabil, designul trebuie să fie clar, comunicarea trebuie să 
            fie directă.
          </p>
          <p>
            Oferim feedback constant și așteptăm același lucru. Creștem împreună și învățăm din greșeli fără 
            blamming.
          </p>
        </div>
      </section>

      {/* Beneficii */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-8">Ce oferim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="card-feature p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[var(--newa-radius-md)] bg-[var(--newa-brand-accent-indigo)]/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--newa-brand-accent-indigo)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--newa-text-primary)]">{benefit.title}</h3>
                </div>
                <p className="body text-[var(--newa-text-secondary)]">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Roluri deschise */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-8">Roluri deschise</h2>
        <div className="space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isOpen = openRole === role.id;
            
            return (
              <Collapsible 
                key={role.id}
                open={isOpen}
                onOpenChange={() => setOpenRole(isOpen ? null : role.id)}
              >
                <div className="border border-[var(--newa-border-subtle)] rounded-[var(--newa-radius-lg)] bg-[var(--newa-surface-light)] overflow-hidden">
                  <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-[var(--newa-state-hover)] transition-colors newa-focus-ring">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[var(--newa-radius-md)] bg-[var(--newa-brand-accent-indigo)]/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-[var(--newa-brand-accent-indigo)]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-[var(--newa-text-primary)]">{role.title}</h3>
                        <p className="text-sm text-[var(--newa-text-tertiary)]">{role.subtitle}</p>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-[var(--newa-text-tertiary)]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[var(--newa-text-tertiary)]" />
                    )}
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-6 pb-6 pt-2 border-t border-[var(--newa-border-subtle)]">
                      <p className="body text-[var(--newa-text-secondary)] mb-4">{role.description}</p>
                      <h4 className="font-medium text-[var(--newa-text-primary)] mb-2">Ce căutăm:</h4>
                      <ul className="space-y-2">
                        {role.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-[var(--newa-text-secondary)]">
                            <span className="text-[var(--newa-brand-accent-indigo)] mt-1">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </section>

      {/* Proces */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-8">Procesul de recrutare</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {processSteps.map((step, index) => (
            <div 
              key={index}
              className="relative p-6 rounded-[var(--newa-radius-lg)] bg-[var(--newa-surface-light)] border border-[var(--newa-border-subtle)]"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--newa-brand-accent-indigo)] flex items-center justify-center text-[var(--newa-text-inverse)] font-bold mb-4">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-[var(--newa-text-primary)] mb-2">{step.title}</h3>
              <p className="body text-[var(--newa-text-secondary)]">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center p-8 rounded-[var(--newa-radius-xl)] bg-gradient-to-br from-[var(--newa-brand-accent-indigo)]/10 to-[var(--newa-brand-accent-emerald)]/10 border border-[var(--newa-border-subtle)]">
        <MessageSquare className="w-12 h-12 text-[var(--newa-brand-accent-indigo)] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[var(--newa-text-primary)] mb-2">Vrei să discutăm?</h2>
        <p className="body text-[var(--newa-text-secondary)] mb-6 max-w-lg mx-auto">
          Trimite-ne un email cu CV-ul tău și câteva rânduri despre tine. Răspundem în maxim 5 zile lucrătoare.
        </p>
        <Button 
          asChild
          className="btn-primary"
        >
          <a href="mailto:hr@finguard.ro" className="inline-flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Trimite CV
          </a>
        </Button>
      </section>
    </PageShell>
  );
};

export default Careers;
