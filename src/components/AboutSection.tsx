
import React from 'react';

const AboutSection: React.FC = () => {
  return (
    <section className="py-20 bg-[#0B1020] relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#F4B329 1px, transparent 1px), linear-gradient(90deg, #F4B329 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      
      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-[#F4B329] text-xs font-bold uppercase tracking-[4px] mb-4 block">Our Vision</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">國防自主研發領航</h2>
          <p className="text-[#B8C5D6] text-lg mb-8 leading-relaxed">
            深耕在地、放眼國際，整合無人機、碳基材料與 AI 國防應用資源，協助政府與企業打造具備國際競爭力的國防產業生態系。
          </p>

          <div className="space-y-6">
            {[
              { title: '連結國內外頂尖研發團隊與供應鏈', desc: '建立跨國合作網路，整合最前沿技術資源' },
              { title: '以系統性視視角規劃無人機與感測網路', desc: '從整體架構出發，確保系統間的無縫整合' },
              { title: '結合碳基材料與 AI 強化國防平台韌性', desc: '運用先進材料與智慧系統提升整體防禦能力' }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-5 bg-[#0F1525] rounded-xl border border-[#1E2840] hover:border-[#F4B329]/30 hover:bg-[#131B30] transition-all group">
                <div className="w-12 h-12 shrink-0 bg-[#F4B329]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#F4B329]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{feature.title}</h4>
                  <p className="text-sm text-[#6B7A8F]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0F1525] border border-[#1E2840] rounded-2xl p-10 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F4B329] to-[#D4961F] rounded-t-2xl"></div>
          <h3 className="text-2xl font-bold mb-8">核心能力指標</h3>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: '年產業經驗', value: '15+' },
              { label: '合作夥伴', value: '50+' },
              { label: '完成專案', value: '200+' },
              { label: '客戶滿意度', value: '98%' }
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 bg-[#05070B] rounded-xl border border-[#1E2840]">
                <div className="text-4xl font-bold text-[#F4B329] mb-2">{stat.value}</div>
                <div className="text-xs uppercase tracking-wider text-[#6B7A8F]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
