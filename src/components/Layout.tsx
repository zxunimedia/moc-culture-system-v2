import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Mail, Globe, Languages, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage, t } = useApp();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t.nav.home, path: '/' },
    { name: t.nav.about, path: '/about' },
    { name: t.nav.focus, path: '/focus' },
    { name: t.nav.newsroom, path: '/newsroom' },
    { name: t.nav.insights, path: '/insights' },
    { name: t.nav.contact, path: '/contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-tech-black/90 backdrop-blur-md py-4 border-b border-white/10' : 'bg-transparent py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tighter text-white">
              MORRISON LEE <span className="text-tech-orange">| 李孟居</span>
            </span>
            <span className="text-[10px] text-tech-silver uppercase tracking-[0.2em] font-medium">Market Leadership Consultant</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-[13px] font-bold tracking-widest uppercase transition-all hover:text-tech-orange ${
                  location.pathname === link.path ? 'text-tech-orange' : 'text-tech-silver'
                }`}
              >
                {link.name}
              </Link>
            ))}
            
            <button 
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex items-center space-x-2 text-[11px] font-extrabold text-tech-silver hover:text-tech-orange transition-colors border border-white/20 px-3 py-1 rounded-sm"
            >
              <Languages size={14} />
              <span>{language === 'zh' ? 'EN' : 'ZH'}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-tech-black border-b border-white/10">
          <div className="px-6 py-10 space-y-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between text-lg font-bold text-white uppercase tracking-wider"
              >
                {link.name}
                <ChevronRight size={18} className="text-tech-orange" />
              </Link>
            ))}
            <button 
              onClick={() => {
                setLanguage(language === 'zh' ? 'en' : 'zh');
                setIsOpen(false);
              }}
              className="w-full py-4 border border-white/10 text-tech-silver font-bold uppercase tracking-widest"
            >
              Switch to {language === 'zh' ? 'English' : '中文'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

const Footer = () => {
  const { t } = useApp();
  return (
    <footer className="bg-tech-black border-t border-white/10 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-extrabold mb-6 text-white tracking-tighter">
              MORRISON LEE <span className="text-tech-orange">李孟居</span>
            </h2>
            <p className="text-tech-silver mb-10 max-w-md text-[15px] leading-relaxed">
              「科技 × 商業」跨域整合顧問。深耕國防無人機、智慧材料與 AI 應用，致力於為技術方案尋求精準的市場落地與國際合作出口。
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-tech-silver hover:text-tech-orange transition-colors">
                <Globe size={20} />
              </a>
              <a href="mailto:synta@kimo.com" className="text-tech-silver hover:text-tech-orange transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-8 text-xs uppercase tracking-[0.2em]">{t.nav.focus}</h3>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-tech-silver hover:text-tech-orange transition-colors text-sm font-medium">{t.nav.about}</Link></li>
              <li><Link to="/focus" className="text-tech-silver hover:text-tech-orange transition-colors text-sm font-medium">{t.nav.focus}</Link></li>
              <li><Link to="/insights" className="text-tech-silver hover:text-tech-orange transition-colors text-sm font-medium">{t.nav.insights}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-8 text-xs uppercase tracking-[0.2em]">Contact</h3>
            <ul className="space-y-4 text-tech-silver text-sm font-medium">
              <li>Taipei / Hsinchu / Taichung</li>
              <li>synta@kimo.com</li>
              <li>morrison@singularwings.com</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-white/5 flex flex-col md:row justify-between items-center text-[11px] text-[#4A4F58] tracking-widest uppercase font-bold">
          <p>© 2025 Morrison Lee. All rights reserved.</p>
          <div className="flex space-x-8 mt-6 md:mt-0">
             <span>Defense</span>
             <span>Smart Materials</span>
             <span>AI Integration</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};