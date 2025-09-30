import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  const handleSettings = () => {
    // Open settings modal or redirect to settings page
    console.log('Open cookie settings');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in-up">
      <div className="bg-white border-t border-gray-200 shadow-2xl">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-gray-700 text-sm leading-relaxed">
                Folosim cookie-uri pentru a îmbunătăți experiența ta pe site. Citește{' '}
                <a
                  href="#"
                  className="text-indigo-600 hover:text-indigo-700 font-medium underline"
                >
                  Politica de Confidențialitate
                </a>{' '}
                pentru mai multe detalii.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSettings}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Setări
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200"
              >
                Acceptă
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
