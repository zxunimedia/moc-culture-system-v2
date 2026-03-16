
import React from 'react';
import { NEWS_DATA } from '../constants';

const NewsSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#05070B]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
          <div className="max-w-[600px]">
            <span className="text-[#F4B329] text-xs font-bold uppercase tracking-[4px] mb-4 block">Latest News</span>
            <h2 className="text-4xl font-bold mb-4">產業洞察與媒體報導</h2>
            <p className="text-[#B8C5D6]">
              精選與李孟居相關的國防科技、無人機國防供應鏈、碳基複材等重要報導。
            </p>
          </div>
          <button className="hidden md:flex w-14 h-14 bg-[#F4B329] rounded-full items-center justify-center text-[#05070B] hover:bg-[#F8C866] hover:shadow-xl hover:shadow-[#F4B329]/30 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7-7 7M3 12h18" /></svg>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {NEWS_DATA.map((news) => (
            <a key={news.id} href={news.link} className="flex flex-col p-8 bg-[#0F1525] border border-[#1E2840] rounded-2xl hover:bg-[#131B30] hover:border-[#F4B329]/50 transition-all group shadow-xl">
              <div className="text-[#F4B329] text-xs font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {news.date}
              </div>
              <h3 className="text-lg font-bold mb-4 leading-relaxed group-hover:text-[#F4B329] transition-all">
                {news.title}
              </h3>
              <p className="text-sm text-[#B8C5D6] leading-relaxed mb-6 flex-1">
                {news.excerpt}
              </p>
              <div className="text-[#F4B329] text-xs font-bold flex items-center gap-2">
                前往完整報導 <span>&rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
