import { useState, useEffect } from 'react';
import { ArrowUp, Sparkles, Phone } from 'lucide-react';

const SmartStickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [ctaType, setCtaType] = useState<'scroll-top' | 'demo' | 'contact'>('demo');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Show CTA after scrolling 300px
      setIsVisible(scrollPosition > 300);

      // Change CTA type based on scroll position
      if (scrollPosition < windowHeight * 2) {
        setCtaType('demo');
      } else if (scrollPosition > documentHeight - windowHeight * 1.5) {
        setCtaType('scroll-top');
      } else {
        setCtaType('contact');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToDemo = () => {
    const element = document.getElementById('demo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToContact = () => {
    const element = document.getElementById('pricing');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-40 animate-fade-in">
      {ctaType === 'scroll-top' && (
        <button
          onClick={scrollToTop}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-primary text-white rounded-full shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="font-medium">Înapoi sus</span>
        </button>
      )}

      {ctaType === 'demo' && (
        <button
          onClick={scrollToDemo}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-primary text-white rounded-full shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Vezi demo</span>
        </button>
      )}

      {ctaType === 'contact' && (
        <button
          onClick={scrollToContact}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-primary text-white rounded-full shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105"
        >
          <Phone className="w-5 h-5" />
          <span className="font-medium">Începe acum</span>
        </button>
      )}
    </div>
  );
};

export default SmartStickyCTA;
