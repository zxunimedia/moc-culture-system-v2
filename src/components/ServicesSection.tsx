
import React from 'react';

const ServicesSection: React.FC = () => {
  const services = [
    {
      title: '產業策略諮詢',
      desc: '協助企業制定無人機與國防市場進入策略，分析盟國需求與「非紅供應鏈」佈局。',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    },
    {
      title: '技術整合評估',
      desc: '評估碳纖維複材、智慧材料與感測模組的量產可行性與系統整合路徑。',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.631.316a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l-1.16 1.16a2 2 0 00.514 3.235 9 9 0 0011.332 0 2 2 0 00.514-3.235l-1.16-1.16z" />
    },
    {
      title: '國際合作媒合',
      desc: '串聯國際系統商與在地供應鏈，建立長期合作模式與技術授權機制。',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
    }
  ];

  return (
    <section className="py-24 bg-[#05070B]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-[700px] mx-auto mb-16">
          <span className="text-[#F4B329] text-xs font-bold uppercase tracking-[4px] mb-4 block">Our Services</span>
          <h2 className="text-4xl font-bold mb-6">專業顧問服務</h2>
          <p className="text-[#B8C5D6]">
            提供全方位的國防產業整合服務，從策略規劃到技術執行，協助客戶在無人機國防供應鏈、碳基材料與國土安全監控等領域精準佈局。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, i) => (
            <div key={i} className="bg-[#0F1525] border border-[#1E2840] p-10 rounded-2xl text-center group hover:border-[#F4B329] hover:-translate-y-2 transition-all">
              <div className="w-20 h-20 bg-[#F4B329]/10 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-[#F4B329] transition-all">
                <svg className="w-10 h-10 text-[#F4B329] group-hover:text-[#05070B] transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {service.icon}
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">{service.title}</h3>
              <p className="text-sm text-[#B8C5D6] leading-relaxed mb-8">{service.desc}</p>
              <a href="#" className="text-[#F4B329] font-semibold text-sm inline-flex items-center gap-2 hover:gap-3 transition-all">
                了解更多 <span>&rarr;</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
