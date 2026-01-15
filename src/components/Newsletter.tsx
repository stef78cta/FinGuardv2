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
    <section className="section-padding-reduced bg-gray-50">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Rămâi la curent cu cele mai noi strategii FP&A
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Primește lunar insights exclusive despre analiză financiară, KPI-uri esențiale și optimizări bugetare
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresa ta de email"
              required
              className="flex-1 px-6 py-4 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              Abonează-te
              <Send className="w-5 h-5" />
            </button>
          </form>
          
          <p className="text-sm text-gray-500 mt-4">
            🔒 Confidențialitate garantată. Poți anula abonamentul oricând.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
