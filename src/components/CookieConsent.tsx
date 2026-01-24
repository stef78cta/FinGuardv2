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
    <div className="fixed bottom-0 left-0 right-0 z-[var(--newa-z-modal)] animate-fade-in-up">
      <div className="bg-[var(--newa-surface-light)] border-t border-[var(--newa-border-default)] shadow-2xl">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-[var(--newa-text-secondary)] text-sm leading-relaxed">
                Folosim cookie-uri pentru a îmbunătăți experiența ta pe site. Citește{' '}
                <a
                  href="#"
                  className="text-[var(--newa-brand-accent-indigo)] hover:opacity-80 font-medium underline newa-focus-ring rounded"
                >
                  Politica de Confidențialitate
                </a>{' '}
                pentru mai multe detalii.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSettings}
                className="px-6 py-2 text-[var(--newa-text-secondary)] border border-[var(--newa-border-default)] rounded-[var(--newa-radius-md)] font-medium hover:bg-[var(--newa-state-hover)] transition-colors duration-200 newa-focus-ring"
              >
                Setări
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-gradient-primary text-[var(--newa-text-inverse)] rounded-[var(--newa-radius-md)] font-medium hover:opacity-90 transition-opacity duration-200 newa-focus-ring"
              >
                Acceptă
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-[var(--newa-text-muted)] hover:text-[var(--newa-text-secondary)] transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)]"
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
