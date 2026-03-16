
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#05070B] border-t border-[#222832] py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div>
            <h3 className="text-lg font-bold text-white mb-6">產業領域</h3>
            <ul className="space-y-4 text-sm text-[#9CA3AF]">
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">無人機國防供應鏈</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">碳基複材應用</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">智慧材料與感測網絡</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">國土安全監控架構</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-white mb-6">顧問服務</h3>
            <ul className="space-y-4 text-sm text-[#9CA3AF]">
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">產業策略諮詢</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">技術整合評估</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">國際合作媒合</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">產業洞察報告</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-6">關於我們</h3>
            <ul className="space-y-4 text-sm text-[#9CA3AF]">
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">個人簡介</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">媒體報導</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">演講與影音</a></li>
              <li><a href="#" className="hover:text-[#F4B329] transition-colors">聯絡我們</a></li>
            </ul>
            <div className="flex gap-4 mt-8">
              {['F', 'in', 'YT'].map((icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-full border border-[#4B5563] flex items-center justify-center text-xs hover:border-[#F4B329] hover:text-[#F4B329] transition-all">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          <div className="bg-[#0F1525] p-8 rounded-3xl shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">訂閱產業洞察</h3>
            <p className="text-xs text-[#9CA3AF] mb-6">
              不定期寄送無人機國防供應鏈、碳基科技與國防產業重點分析。
            </p>
            <form className="space-y-4">
              <input type="text" placeholder="您的姓名" className="w-full bg-[#05070B] border border-[#374151] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#F4B329] transition-all" />
              <input type="email" placeholder="電子郵件" className="w-full bg-[#05070B] border border-[#374151] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#F4B329] transition-all" />
              <button className="w-full bg-[#F4B329] text-[#05070B] font-bold py-2.5 rounded-full text-sm hover:bg-[#F8C866] transition-all">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-[#1F2933] flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#6B7280]">
          <div>© 2026 李孟居產業整合平台，版權所有。</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#F4B329]">Cookie 聲明</a>
            <span>|</span>
            <a href="#" className="hover:text-[#F4B329]">法律聲明</a>
            <span>|</span>
            <a href="#" className="hover:text-[#F4B329]">隱私權政策</a>
            <span>|</span>
            <a href="#" className="hover:text-[#F4B329]">服務條款</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
