
import React, { useState, useEffect, useCallback } from 'react';
import { CAROUSEL_DATA } from '../constants';

const HeroCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % CAROUSEL_DATA.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? CAROUSEL_DATA.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  useEffect(() => {
    const timer = setInterval(goToNext, 6000);
    return () => clearInterval(timer);
  }, [goToNext]);

  return (
    <section className="relative w-full aspect-[2048/1143] max-h-[85vh] overflow-hidden bg-black mt-[72px]">
      {/* Slides Track */}
      <div 
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {CAROUSEL_DATA.map((slide) => (
          <div key={slide.id} className="min-w-full h-full relative">
            <img 
              src={slide.image} 
              alt={slide.alt} 
              className="w-full h-full object-cover md:object-contain bg-black"
            />
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#05070B]/90 via-[#05070B]/50 to-transparent flex items-center px-6 md:px-20">
              <div className="max-w-[700px] space-y-4 md:space-y-6">
                <h2 className="text-3xl md:text-6xl font-bold leading-tight text-white tracking-wide">
                  {slide.title}
                </h2>
                <p className="text-base md:text-xl text-[#B8C5D6] leading-relaxed max-w-[600px]">
                  {slide.description}
                </p>
                {slide.ctaText && (
                  <div className="pt-4">
                    <a 
                      href={slide.ctaLink} 
                      className="inline-flex items-center px-8 py-4 bg-[#F4B329] text-[#05070B] font-bold rounded-full hover:bg-[#F8C866] transform hover:-translate-y-1 transition-all shadow-lg shadow-[#F4B329]/20"
                    >
                      {slide.ctaText}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={goToPrev}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-[#F4B329] hover:text-[#05070B] transition-all z-10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button 
        onClick={goToNext}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-[#F4B329] hover:text-[#05070B] transition-all z-10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {CAROUSEL_DATA.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 ${currentIndex === idx ? 'w-10 bg-[#F4B329]' : 'w-3 bg-white/30'} h-3 rounded-full`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
