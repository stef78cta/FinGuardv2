import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FinalCTASection = () => {
  return <section className="section-padding-reduced bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl"></div>

      <div className="container-narrow relative z-10">
        <div className="text-center text-white">
          <h2 className="headline text-white mb-5">
            Gata să transformi datele în 
            <span className="block">decizii inteligente?</span>
          </h2>
          
          <p className="body text-indigo-100 mb-8 max-w-2xl mx-auto">
            Alătură-te celor 500+ de companii care au economisit deja 10,000+ ore cu FinGuard.
          </p>

          <div className="mb-6">
            <Link 
              to="/signup"
              className="bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-white/25 hover:scale-[1.02] transition-all duration-300 group inline-flex items-center"
            >
              Începe gratuit acum
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          

          {/* Floating Dashboard Elements */}
          <div className="absolute -top-8 -left-8 opacity-20">
            <div className="w-24 h-16 bg-white/30 rounded-lg"></div>
          </div>
          <div className="absolute top-12 -right-12 opacity-20">
            <div className="w-32 h-20 bg-white/30 rounded-lg"></div>
          </div>
          <div className="absolute -bottom-4 left-16 opacity-20">
            <div className="w-20 h-14 bg-white/30 rounded-lg"></div>
          </div>
        </div>
      </div>
    </section>;
};
export default FinalCTASection;