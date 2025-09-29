import { useState, useEffect } from 'react';
import { Shield, Menu, X } from 'lucide-react';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-lg shadow-soft' 
          : 'bg-transparent'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">FinGuard</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200"
            >
              Caracteristici
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200"
            >
              Prețuri
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200"
            >
              Demo
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200"
            >
              Cazuri de Utilizare
            </button>
          </div>

          {/* CTA Button */}
          <div className="hidden lg:block">
            <button 
              onClick={() => scrollToSection('hero')}
              className="btn-secondary"
            >
              Începe gratuit
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-700 hover:text-indigo-600 transition-colors duration-200"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-large border-t border-gray-100 animate-fade-in-up">
            <div className="py-6 px-4 space-y-4">
              <button
                onClick={() => scrollToSection('features')}
                className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200"
              >
                Caracteristici
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200"
              >
                Prețuri
              </button>
              <button
                onClick={() => scrollToSection('demo')}
                className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200"
              >
                Demo
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className="block w-full text-left py-3 px-4 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200"
              >
                Cazuri de Utilizare
              </button>
              <div className="pt-4 border-t border-gray-100">
                <button className="btn-secondary w-full">
                  Începe gratuit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;