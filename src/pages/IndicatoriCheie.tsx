import { Target } from 'lucide-react';

const IndicatoriCheie = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Indicatori Cheie
        </h1>
        <p className="text-foreground-secondary">
          Monitorizați KPI-urile cheie ale afacerii
        </p>
      </div>

      {/* Content Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <div className="flex items-center justify-center h-32 text-center">
              <div>
                <Target className="w-12 h-12 text-indigo-200 mx-auto mb-2" />
                <p className="text-sm text-foreground-secondary">
                  KPI #{item}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IndicatoriCheie;
