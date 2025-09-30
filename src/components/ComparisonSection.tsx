import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

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

        <div className="text-center mt-12">
          <button className="btn-primary">
            Încearcă gratuit 14 zile
          </button>
          <p className="text-sm text-gray-500 mt-4 flex items-center justify-center space-x-4">
            <span>💳 Fără card necesar</span>
            <span>❌ Anulare oricând</span>
            <span>🔒 Plată securizată</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;