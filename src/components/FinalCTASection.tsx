import { ArrowRight } from 'lucide-react';
const FinalCTASection = () => {
  return <section className="section-padding-reduced bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl"></div>

      <div className="container-narrow relative z-10">
        <div className="text-center text-white">
          <h2 className="headline text-white mb-8">
            Gata să transformi datele în 
            <span className="block">decizii inteligente?</span>
          </h2>
          
          <p className="body-large text-indigo-100 mb-12 max-w-2xl mx-auto">
            Alătură-te celor 500+ de companii care au economisit deja 10,000+ ore cu FinGuard.
          </p>

          <div className="mb-8">
            <button className="bg-white text-indigo-600 px-12 py-6 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-white/25 hover:scale-105 transition-all duration-300 group">
              Începe gratuit acum
              <ArrowRight className="w-6 h-6 ml-3 inline group-hover:translate-x-1 transition-transform duration-200" />
            </button>
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