import { useEffect, useRef, useState } from 'react';
import { Check, X, Zap, Shield, Lock, ArrowRight } from 'lucide-react';

const ComparisonSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const comparisonData = [
    {
      feature: 'Timp de analiză',
      finGuard: '30 secunde',
      consultant: '2-5 zile',
      manual: '6+ ore',
    },
    {
      feature: 'Cost lunar',
      finGuard: '49€',
      consultant: '800-2000€',
      manual: '€0 (dar timpul tău)',
    },
    {
      feature: 'Disponibilitate',
      finGuard: '24/7 instant',
      consultant: 'Program limitat',
      manual: 'Când ai timp',
    },
    {
      feature: 'Actualizare date',
      finGuard: 'Real-time',
      consultant: 'Lunar/trimestrial',
      manual: 'Manual când vrei',
    },
    {
      feature: 'Previziuni AI',
      finGuard: true,
      consultant: false,
      manual: false,
    },
    {
      feature: 'Multi-device',
      finGuard: true,
      consultant: false,
      manual: false,
    },
    {
      feature: 'Confidențialitate',
      finGuard: true,
      consultant: 'partial',
      manual: true,
    },
  ];

  const renderCell = (value: string | boolean, isFinGuard = false) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className={`w-5 h-5 ${isFinGuard ? 'text-emerald-600' : 'text-gray-400'}`} />
      ) : (
        <X className="w-5 h-5 text-red-500" />
      );
    }

    if (value === 'partial') {
      return <span className="text-orange-500 text-sm">? Partajat</span>;
    }

    return (
      <span className={`text-sm ${isFinGuard ? 'font-semibold text-emerald-600' : 'text-gray-600'}`}>
        {value}
      </span>
    );
  };

  return (
    <section 
      ref={sectionRef}
      className="section-padding-reduced bg-gradient-to-b from-surface to-white"
    >
      <div className="container-narrow">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="subheadline text-gray-900 mb-6">
            FinGuard vs. Metode Tradiționale
          </h2>
        </div>

        <div 
          className={`bg-white rounded-2xl shadow-large border border-gray-100 overflow-hidden transform transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-6 px-6 font-semibold text-gray-900"></th>
                  <th className="text-center py-6 px-6">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl font-bold">
                      FinGuard
                    </div>
                  </th>
                  <th className="text-center py-6 px-6 font-semibold text-gray-700">
                    Consultant Financiar
                  </th>
                  <th className="text-center py-6 px-6 font-semibold text-gray-700">
                    Analiză Manuală
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr 
                    key={index} 
                    className={`border-b border-gray-50 hover:bg-gray-25 transition-colors duration-200 ${
                      index % 2 === 0 ? 'bg-gray-25/50' : 'bg-white'
                    }`}
                  >
                    <td className="py-4 px-6 font-medium text-gray-900">
                      {row.feature}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderCell(row.finGuard, true)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderCell(row.consultant)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {renderCell(row.manual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* High-Converting CTA Section */}
        <div className="mt-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Benefit Card 1 */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 transform"
              style={{ animationDelay: '0ms' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-300">
                  <Zap className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Start Instant Fără Card
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Începeți imediat, fără să adăugați cardul. Zero risc, zero obligații. Testați toate funcționalitățile premium gratuit.
                </p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                  ✓ Activare în 30 secunde
                </span>
              </div>
            </div>

            {/* Benefit Card 2 */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 transform"
              style={{ animationDelay: '100ms' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Anulare Fără Complicații
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Un singur click și gata! Anulați oricând doriți, fără întrebări și fără taxe ascunse. Controlul complet este al dumneavoastră.
                </p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                  ✓ Garantat 100%
                </span>
              </div>
            </div>

            {/* Benefit Card 3 */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 transform"
              style={{ animationDelay: '200ms' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-300">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Securitate Bancară
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Datele dumneavoastră sunt protejate cu encriptare de nivel bancar. Certificare SSL și conformitate GDPR completă.
                </p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                  ✓ Protecție 256-bit
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced CTA Button */}
          <div className="text-center">
            <button className="btn-primary bg-white text-indigo-600 hover:bg-gray-50 px-8 py-4 text-lg font-bold inline-flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Încearcă gratuit 14 zile
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;