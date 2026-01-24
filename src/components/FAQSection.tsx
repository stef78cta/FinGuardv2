import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Cum funcționează perioada de probă?',
      answer: 'Primești 14 zile de acces complet la planul Professional, fără să introduci cardul. După expirare, poți continua cu planul gratuit sau upgrade.',
    },
    {
      question: 'Este sigur să urc documentele financiare?',
      answer: 'Absolut. Folosim criptare end-to-end (AES-256), serverele sunt în EU (GDPR compliant), și datele tale sunt șterse automat după 90 de zile. Niciodată nu vindem sau partajăm informații.',
    },
    {
      question: 'Ce formate de fișiere acceptați?',
      answer: 'PDF, Excel (.xlsx, .xls), CSV. Platforma recunoaște automat structura balanței contabile românești standard.',
    },
    {
      question: 'Pot folosi FinGuard pentru mai multe companii?',
      answer: 'Da! Planul Professional permite gestiunea a 3 entități separate, iar planul Enterprise oferă clienți nelimitați (ideal pentru firme de contabilitate).',
    },
    {
      question: 'Cât de precise sunt previziunile AI?',
      answer: 'Modelul nostru are 91% acuratețe pe previziuni de 3 luni și 87% pe 6 luni, bazat pe validare cu 10,000+ cazuri reale din ultimii 2 ani.',
    },
    {
      question: 'Oferă FinGuard suport pentru configurare?',
      answer: 'Da! Toți utilizatorii primesc un onboarding call de 15 minute, plus documentație video step-by-step. Utilizatorii Enterprise au un manager dedicat.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="section-padding-reduced bg-[var(--newa-surface-canvas)]">
      <div className="container-narrow">
        <div className="text-center mb-6">
          <h2 className="subheadline text-[var(--newa-text-primary)] mb-3">
            Întrebări frecvente
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[var(--newa-surface-light)] rounded-[var(--newa-radius-md)] border border-[var(--newa-border-default)] overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-4 hover:bg-[var(--newa-state-hover)] transition-colors duration-200 flex items-center justify-between newa-focus-ring"
              >
                <span className="font-semibold text-sm text-[var(--newa-text-primary)] pr-3">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 text-[var(--newa-text-muted)] transition-transform duration-300 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  openIndex === index 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4">
                  <p className="text-sm text-[var(--newa-text-secondary)]">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;