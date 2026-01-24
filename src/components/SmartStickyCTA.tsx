import { useState, useEffect } from 'react';
import { ArrowUp, Sparkles, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SmartStickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [ctaType, setCtaType] = useState<'scroll-top' | 'demo' | 'signup'>('demo');
  const navigate = useNavigate();

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
        setCtaType('signup');
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

  const goToSignup = () => {
    navigate('/signup');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[var(--newa-z-sticky)] animate-fade-in">
      {ctaType === 'scroll-top' && (
        <button
          onClick={scrollToTop}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-primary text-[var(--newa-text-inverse)] rounded-full shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105 newa-focus-ring"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="font-medium">Înapoi sus</span>
        </button>
      )}

      {ctaType === 'demo' && (
        <button
          onClick={scrollToDemo}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-primary text-[var(--newa-text-inverse)] rounded-full shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105 newa-focus-ring"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Vezi demo</span>
        </button>
      )}

      {ctaType === 'signup' && (
        <button
          onClick={goToSignup}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-primary text-[var(--newa-text-inverse)] rounded-full shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105 newa-focus-ring"
        >
          <UserPlus className="w-5 h-5" />
          <span className="font-medium">Înregistrare</span>
        </button>
      )}
    </div>
  );
};

export default SmartStickyCTA;
