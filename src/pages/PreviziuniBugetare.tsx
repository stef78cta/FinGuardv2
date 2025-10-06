import { Calendar } from 'lucide-react';

const PreviziuniBugetare = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Previziuni Bugetare
        </h1>
        <p className="text-foreground-secondary">
          Planificați și previzionați bugetul viitor
        </p>
      </div>

      {/* Content Placeholder */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <Calendar className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
            <p className="text-foreground-secondary">
              Calendar și timeline pentru previziuni bugetare
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviziuniBugetare;
