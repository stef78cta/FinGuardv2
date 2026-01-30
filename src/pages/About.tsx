import PageShell from '@/components/marketing/PageShell';
import { 
  Target, 
  CheckCircle2, 
  Shield, 
  FileText, 
  Users, 
  Lock, 
  BarChart3,
  GitBranch,
  Mail
} from 'lucide-react';

const About = () => {
  const features = [
    { icon: FileText, text: 'Import balanțe contabile din Excel sau alte sisteme' },
    { icon: GitBranch, text: 'Mapări flexibile la structuri de raportare personalizate' },
    { icon: BarChart3, text: 'Rapoarte P&L, Bilanț și Cash Flow automatizate' },
    { icon: CheckCircle2, text: 'Validări automate pentru detectarea erorilor' },
    { icon: Shield, text: 'Trasabilitate completă a tuturor modificărilor' },
    { icon: Users, text: 'Colaborare în echipă cu roluri și permisiuni' },
  ];

  const principles = [
    {
      icon: Target,
      title: 'Acuratețe',
      description: 'Fiecare cifră este trasabilă până la sursă. Validările automate previn erorile înainte să ajungă în rapoarte.',
    },
    {
      icon: GitBranch,
      title: 'Trasabilitate',
      description: 'Istoric complet al tuturor modificărilor. Știi cine, când și ce a schimbat în orice moment.',
    },
    {
      icon: Lock,
      title: 'Securitate',
      description: 'Acces pe bază de roluri, autentificare securizată și criptare a datelor în tranzit și în repaus.',
    },
    {
      icon: CheckCircle2,
      title: 'Simplitate',
      description: 'Interfață curată, fără complexitate inutilă. Focus pe ceea ce contează pentru decizii.',
    },
  ];

  const audiences = [
    'Directori Financiari (CFO) care au nevoie de vizibilitate rapidă asupra performanței',
    'Controlleri care coordonează procesul de raportare',
    'Echipe de contabilitate care pregătesc închiderile lunare',
    'Antreprenori care vor să înțeleagă numerele din spatele afacerii',
  ];

  return (
    <PageShell
      title="Despre noi"
      heroTitle="Claritate financiară pentru decizii mai bune"
      heroSubtitle="Platformă de analiză, raportare și control financiar pentru echipe de management și contabilitate."
    >
      {/* Misiunea */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-6">Misiunea noastră</h2>
        <div className="space-y-4 body-large text-[var(--newa-text-secondary)]">
          <p>
            Procesul de închidere lunară și raportare financiară consumă timp prețios care ar putea fi folosit 
            pentru analiză și decizii. Datele sunt fragmentate în Excel-uri, e-mailuri și sisteme diferite.
          </p>
          <p>
            FinGuard aduce toate datele financiare într-un singur loc, automatizează transformările repetitive 
            și oferă rapoarte consistente la fiecare închidere. Reducem timpul de la zile la ore.
          </p>
          <p>
            Credem că echipele financiare ar trebui să se concentreze pe interpretare și recomandări strategice, 
            nu pe manipularea manuală a datelor și verificări repetitive.
          </p>
        </div>
      </section>

      {/* Ce facem */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-8">Ce facem</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="flex items-start gap-4 p-4 rounded-[var(--newa-radius-lg)] bg-[var(--newa-surface-light)] border border-[var(--newa-border-subtle)]"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-[var(--newa-radius-md)] bg-[var(--newa-brand-accent-indigo)]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--newa-brand-accent-indigo)]" />
                </div>
                <p className="body text-[var(--newa-text-primary)]">{feature.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pentru cine */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-6">Pentru cine</h2>
        <ul className="space-y-3">
          {audiences.map((audience, index) => (
            <li key={index} className="flex items-start gap-3 body text-[var(--newa-text-secondary)]">
              <CheckCircle2 className="w-5 h-5 text-[var(--newa-status-success)] flex-shrink-0 mt-0.5" />
              <span>{audience}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Principii */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-8">Principiile noastre</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {principles.map((principle, index) => {
            const Icon = principle.icon;
            return (
              <div 
                key={index}
                className="card-feature p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-[var(--newa-radius-md)] bg-[var(--newa-brand-accent-indigo)]/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[var(--newa-brand-accent-indigo)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--newa-text-primary)]">{principle.title}</h3>
                </div>
                <p className="body text-[var(--newa-text-secondary)]">{principle.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Securitate */}
      <section className="mb-16">
        <h2 className="section-title text-[var(--newa-text-primary)] mb-6">Securitate</h2>
        <div className="p-6 rounded-[var(--newa-radius-lg)] bg-[var(--newa-surface-light)] border border-[var(--newa-border-subtle)]">
          <p className="body text-[var(--newa-text-secondary)]">
            Datele financiare sunt sensibile. Implementăm măsuri de securitate adecvate: acces pe bază de roluri 
            și permisiuni, autentificare securizată, jurnalizarea acțiunilor utilizatorilor, și criptarea datelor 
            în tranzit. Infrastructura este găzduită în centre de date conforme cu standardele industriei.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="section-title text-[var(--newa-text-primary)] mb-6">Contact</h2>
        <div className="flex items-center gap-3 p-6 rounded-[var(--newa-radius-lg)] bg-[var(--newa-surface-light)] border border-[var(--newa-border-subtle)]">
          <Mail className="w-5 h-5 text-[var(--newa-brand-accent-indigo)]" />
          <a 
            href="mailto:contact@finguard.ro" 
            className="body text-[var(--newa-brand-accent-indigo)] hover:underline newa-focus-ring rounded"
          >
            contact@finguard.ro
          </a>
        </div>
      </section>
    </PageShell>
  );
};

export default About;
