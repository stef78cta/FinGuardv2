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
    <section className="section-padding-reduced bg-gradient-to-br from-indigo-600 to-purple-600">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Rămâi la curent cu cele mai noi strategii FP&A
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Primește lunar insights exclusive despre analiză financiară, KPI-uri esențiale și optimizări bugetare
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresa ta de email"
              required
              className="flex-1 px-6 py-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              Abonează-te
              <Send className="w-5 h-5" />
            </button>
          </form>
          
          <p className="text-sm text-white/70 mt-4">
            🔒 Confidențialitate garantată. Poți anula abonamentul oricând.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
