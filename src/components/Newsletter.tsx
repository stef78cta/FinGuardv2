import { useState } from 'react';
import { Send } from 'lucide-react';

const Newsletter = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Newsletter subscription:', email);
    setEmail('');
  };

  return (
    <section className="section-padding-reduced bg-[var(--newa-surface-canvas)]">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--newa-text-primary)] mb-3">
            Rămâi la curent cu cele mai noi strategii FP&A
          </h2>
          <p className="body text-[var(--newa-text-secondary)] mb-6">
            Primește lunar insights exclusive despre analiză financiară, KPI-uri esențiale și optimizări bugetare
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresa ta de email"
              required
              className="flex-1 px-5 py-3 rounded-[var(--newa-radius-md)] bg-[var(--newa-surface-light)] border border-[var(--newa-border-default)] text-[var(--newa-text-primary)] placeholder-[var(--newa-form-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--newa-brand-accent-indigo)] focus:border-[var(--newa-border-focus)] transition-all duration-200 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[var(--newa-brand-accent-indigo)] text-[var(--newa-text-inverse)] rounded-[var(--newa-radius-md)] font-semibold hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm newa-focus-ring"
            >
              Abonează-te
              <Send className="w-4 h-4" />
            </button>
          </form>
          
          <p className="text-xs text-[var(--newa-text-muted)] mt-3">
            🔒 Confidențialitate garantată. Poți anula abonamentul oricând.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
