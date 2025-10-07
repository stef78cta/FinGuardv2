import { LayoutDashboard } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Dashboard
        </h1>
        <p className="text-foreground-secondary">
          Vizualizare generală a situației financiare
        </p>
      </div>

      {/* Content Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
            <div className="flex items-center justify-center h-48 text-center">
              <div>
                <LayoutDashboard className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
                <p className="text-foreground-secondary">
                  Card statistici #{item}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
