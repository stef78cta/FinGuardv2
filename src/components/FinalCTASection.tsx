import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FinalCTASection = () => {
  return <section className="section-padding-reduced bg-gradient-to-br from-[var(--newa-brand-accent-indigo)] via-purple-600 to-[#4F46E5] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-[var(--newa-surface-light)]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl"></div>

      <div className="container-narrow relative z-10">
        <div className="text-center text-[var(--newa-text-inverse)]">
          <h2 className="headline text-[var(--newa-text-inverse)] mb-5">
            Gata să transformi datele în 
            <span className="block">decizii inteligente?</span>
          </h2>
          
          <p className="body text-[var(--newa-text-inverse)]/80 mb-8 max-w-2xl mx-auto">
            Alătură-te celor 500+ de companii care au economisit deja 10,000+ ore cu FinGuard.
          </p>

          <div className="mb-6">
            <Link 
              to="/signup"
              className="bg-[var(--newa-surface-light)] text-[var(--newa-brand-accent-indigo)] px-10 py-4 rounded-[var(--newa-radius-lg)] font-bold text-lg shadow-xl hover:shadow-[var(--newa-surface-light)]/25 hover:scale-[1.02] transition-all duration-300 group inline-flex items-center newa-focus-ring"
            >
              Începe gratuit acum
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          

          {/* Floating Dashboard Elements */}
          <div className="absolute -top-8 -left-8 opacity-20">
            <div className="w-24 h-16 bg-[var(--newa-surface-light)]/30 rounded-[var(--newa-radius-md)]"></div>
          </div>
          <div className="absolute top-12 -right-12 opacity-20">
            <div className="w-32 h-20 bg-[var(--newa-surface-light)]/30 rounded-[var(--newa-radius-md)]"></div>
          </div>
          <div className="absolute -bottom-4 left-16 opacity-20">
            <div className="w-20 h-14 bg-[var(--newa-surface-light)]/30 rounded-[var(--newa-radius-md)]"></div>
          </div>
        </div>
      </div>
    </section>;
};
export default FinalCTASection;