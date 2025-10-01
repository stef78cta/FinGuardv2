import { Shield, Linkedin, Twitter, Facebook } from 'lucide-react';
const Footer = () => {
  const footerLinks = {
    produs: ['Caracteristici', 'Prețuri', 'Demo interactiv'],
    resurse: ['Blog financiar', 'Cazuri de studiu', 'Ghid KPI-uri'],
    companie: ['Despre noi', 'Cariere', 'Termeni & Condiții', 'Politică confidențialitate']
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
  return <footer className="bg-primary-navy text-white">
      <div className="container-custom py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">FinGuard</span>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              Claritate financiară bazată pe AI
            </p>

            <div className="flex space-x-4">
              {socialLinks.map(social => {
              const IconComponent = social.icon;
              return <a key={social.name} href={social.href} className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200" aria-label={social.name}>
                    <IconComponent className="w-5 h-5" />
                  </a>;
            })}
            </div>
          </div>

          {/* Produs Column */}
          <div>
            <h3 className="font-semibold text-white mb-6">Produs</h3>
            <ul className="space-y-4">
              {footerLinks.produs.map(link => <li key={link}>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>)}
            </ul>
          </div>

          {/* Resurse Column */}
          <div>
            <h3 className="font-semibold text-white mb-6">Resurse</h3>
            <ul className="space-y-4">
              {footerLinks.resurse.map(link => <li key={link}>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>)}
            </ul>
          </div>

          {/* Companie Column */}
          <div>
            <h3 className="font-semibold text-white mb-6">Companie</h3>
            <ul className="space-y-4">
              {footerLinks.companie.map(link => <li key={link}>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>)}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h3 className="font-semibold text-white mb-6">Newsletter</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Primește sfaturi financiare și noutăți despre FinGuard
            </p>
            <form className="space-y-3">
              <input type="email" placeholder="Email-ul tău" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="w-full px-4 py-2 bg-gradient-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
              <p className="text-gray-400 text-sm text-center md:text-left">
                © 2025 FinGuard. Toate drepturile rezervate. | Societate înregistrată în România | J40/XXXX/2024
              </p>
              <div className="flex items-center space-x-4">
                <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                  <img src="https://wpfitness.eu/wp-content/uploads/2022/10/anpc-sal.png" alt="ANPC SAL" className="h-8" />
                </a>
                <a href="https://consumer-redress.ec.europa.eu/site-relocation_en?event=main.home2.show&lng=RO" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                  <img src="https://wpfitness.eu/wp-content/uploads/2022/10/anpc-sol.png" alt="ANPC SOL" className="h-8" />
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              
              <span>•</span>
              <span>Made with ❤️ în Romania</span>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;