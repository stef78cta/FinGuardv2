import { Shield, Linkedin, Twitter, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterLink {
  label: string;
  href: string;
  isExternal?: boolean;
}

const Footer = () => {
  const footerLinks: Record<string, FooterLink[]> = {
    produs: [
      { label: 'Caracteristici', href: '/#features' },
      { label: 'Prețuri', href: '/#pricing' },
      { label: 'Demo interactiv', href: '/signup' },
    ],
    resurse: [
      { label: 'Blog financiar', href: '/blog' },
      { label: 'Cazuri de studiu', href: '/blog' },
      { label: 'Ghid KPI-uri', href: '/blog' },
    ],
    companie: [
      { label: 'Despre noi', href: '/despre' },
      { label: 'Cariere', href: '/cariere' },
      { label: 'Termeni & Condiții', href: '/termeni' },
      { label: 'Politică confidențialitate', href: '/confidentialitate' },
    ],
  };
  const socialLinks = [{
    name: 'LinkedIn',
    icon: Linkedin,
    href: '#'
  }, {
    name: 'Twitter',
    icon: Twitter,
    href: '#'
  }, {
    name: 'Facebook',
    icon: Facebook,
    href: '#'
  }];
  return <footer className="bg-[var(--newa-brand-primary-dark)] text-[var(--newa-text-inverse)]">
      <div className="container-custom py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-primary rounded-[var(--newa-radius-md)] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[var(--newa-text-inverse)]" />
              </div>
              <span className="text-xl font-bold">FinGuard</span>
            </div>
            
            <p className="text-[var(--newa-text-inverse)]/70 mb-6 leading-relaxed">
              Claritate financiară bazată pe AI
            </p>

            <div className="flex space-x-4">
              {socialLinks.map(social => {
              const IconComponent = social.icon;
              return <a key={social.name} href={social.href} className="w-10 h-10 bg-[var(--newa-surface-light)]/10 rounded-[var(--newa-radius-md)] flex items-center justify-center hover:bg-[var(--newa-surface-light)]/20 transition-colors duration-200 newa-focus-ring" aria-label={social.name}>
                    <IconComponent className="w-5 h-5" />
                  </a>;
            })}
            </div>
          </div>

          {/* Produs Column */}
          <div>
            <h3 className="font-semibold text-[var(--newa-text-inverse)] mb-6">Produs</h3>
            <ul className="space-y-4">
              {footerLinks.produs.map(link => (
                <li key={link.label}>
                  <Link 
                    to={link.href} 
                    className="text-[var(--newa-text-inverse)]/70 hover:text-[var(--newa-text-inverse)] transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resurse Column */}
          <div>
            <h3 className="font-semibold text-[var(--newa-text-inverse)] mb-6">Resurse</h3>
            <ul className="space-y-4">
              {footerLinks.resurse.map(link => (
                <li key={link.label}>
                  <Link 
                    to={link.href} 
                    className="text-[var(--newa-text-inverse)]/70 hover:text-[var(--newa-text-inverse)] transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Companie Column */}
          <div>
            <h3 className="font-semibold text-[var(--newa-text-inverse)] mb-6">Companie</h3>
            <ul className="space-y-4">
              {footerLinks.companie.map(link => (
                <li key={link.label}>
                  <Link 
                    to={link.href} 
                    className="text-[var(--newa-text-inverse)]/70 hover:text-[var(--newa-text-inverse)] transition-colors duration-200 newa-focus-ring rounded-[var(--newa-radius-sm)] px-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--newa-surface-light)]/10">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
              <p className="text-[var(--newa-text-inverse)]/60 text-sm text-center md:text-left">
                © 2025 FinGuard. Toate drepturile rezervate. | Societate înregistrată în România | J40/XXXX/2024
              </p>
              <div className="flex items-center space-x-4">
                <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity newa-focus-ring rounded">
                  <img src="https://wpfitness.eu/wp-content/uploads/2022/10/anpc-sal.png" alt="ANPC SAL" className="h-8" />
                </a>
                <a href="https://consumer-redress.ec.europa.eu/site-relocation_en?event=main.home2.show&lng=RO" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity newa-focus-ring rounded">
                  <img src="https://wpfitness.eu/wp-content/uploads/2022/10/anpc-sol.png" alt="ANPC SOL" className="h-8" />
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-[var(--newa-text-inverse)]/60">
              <Link 
                to="/style-guide-v2" 
                className="hover:text-[var(--newa-text-inverse)] transition-colors duration-200 opacity-60 hover:opacity-100 newa-focus-ring rounded-[var(--newa-radius-sm)] px-1"
                title="Design System"
              >
                Style Guide
              </Link>
              <span>•</span>
              <span>Made with ❤️ în Romania</span>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;