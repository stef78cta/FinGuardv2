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
    <section id="faq" className="section-padding bg-surface">
      <div className="container-narrow">
        <div className="text-center mb-16">
          <h2 className="subheadline text-gray-900 mb-6">
            Întrebări frecvente
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-6 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-300 flex-shrink-0 ${
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
                <div className="px-6 pb-6">
                  <p className="body text-gray-600 leading-relaxed">
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