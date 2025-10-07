import { Upload } from 'lucide-react';

const IncarcareBalanta = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Încărcare Balanță
        </h1>
        <p className="text-foreground-secondary">
          Încărcați și procesați balanțe contabile
        </p>
      </div>

      {/* Content Placeholder */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
        <div className="flex items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <div>
            <Upload className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
            <p className="text-foreground-secondary mb-2">
              Zonă drag & drop pentru încărcare fișiere
            </p>
            <p className="text-sm text-foreground-secondary">
              Acceptăm fișiere Excel, CSV și XML
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncarcareBalanta;
