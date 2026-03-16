
import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: '首頁', href: '#' },
    { name: '關於李孟居', href: '#' },
    { name: '顧問服務', href: '#' },
    { name: '媒體報導', href: '#' },
    { name: '影音專區', href: '#' },
    { name: '洞察文章', href: '#' },
    { name: '合作夥伴', href: '#' },
    { name: '聯絡我們', href: '#' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 h-[72px] z-[1000] transition-all duration-300 ${isScrolled ? 'bg-[#05070B]/95 backdrop-blur-md border-b border-[#1E2840]' : 'bg-transparent'}`}>
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
        <a href="/" className="text-2xl font-bold tracking-wider text-white">李孟居</a>

        <nav className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-[#B8C5D6] hover:text-[#F4B329] hover:bg-[#F4B329]/10 rounded-lg transition-all"
            >
              {link.name}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-[#B8C5D6] font-medium">
            <span className="text-[#F4B329]">Morrison</span>，您好
          </div>
          <button className="px-5 py-2 text-sm font-semibold text-[#F4B329] border border-[#F4B329] rounded-full hover:bg-[#F4B329] hover:text-[#05070B] transition-all">
            登出
          </button>
          
          <button 
            className="lg:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="w-6 h-0.5 bg-white"></span>
            <span className="w-6 h-0.5 bg-white"></span>
            <span className="w-6 h-0.5 bg-white"></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-[#05070B] z-[1100] p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <span className="text-2xl font-bold">選單</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-3xl">&times;</button>
          </div>
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-xl py-3 border-b border-[#1E2840]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
