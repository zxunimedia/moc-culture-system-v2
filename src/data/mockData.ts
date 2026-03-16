import { Project, ProjectStatus, BudgetCategory, MOCCheckStatus } from '../types';

// 開發用 Mock 計畫資料，實際部署時可改為從後端載入
export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    projectCode: '114-原鄉-001',  // 計畫編號
    unitId: 'unit-101',
    unitName: '拔馬部落文化發展協會',
    name: '從庫房到衣著,拔馬部落衣飾復刻及日常化計畫',
    executingUnit: '拔馬部落文化發展協會',
    year: '114年度',
    period: '114年12月26日至115年12月5日',
    category: '原鄉文化行動',
    representative: { name: '胡天國', title: '理事長', email: 'bunun@example.com' },
    liaison: { name: '胡曉秘', title: '秘書', email: 'wang@atipd.tw' },
    legalAddress: '南投縣信義鄉...',
    contactAddress: '南投縣信義鄉...',
    siteTypes: ['原鄉'],
    village: '拔馬部落',
    sites: ['部落集會所'],
    appliedAmount: 934915,
    approvedAmount: 850000,
    commissioner: { name: '陳專家', title: '輔導委員', email: 'chen@moc.gov.tw' },
    chiefStaff: { name: '林專員', title: '文化部主責', email: 'lin@moc.gov.tw' },
    visionText: '從庫房到衣著,拔馬部落衣飾復刻及日常化計畫',
    description: '建構部落傳統衣飾之復刻、日常化推廣之脈絡。',
    visions: [
      {
        id: 'vision-1',
        title: '建構部落傳統衣飾之復刻、日常化推廣之脈絡',
        description: '透過系統性的調查與復刻，讓部落傳統衣飾重新回到日常生活中',
        objectives: [
          {
            id: 'obj-1',
            title: '建構拔馬部落衣飾復刻之脈絡',
            weight: 10,
            keyResults: [
              { id: 'kr-1-1', description: '辦理計畫說明會 1 場次', targetValue: 1, expectedDate: '2026-04-30' }
            ]
          }
        ]
      }
    ],
    budgetItems: [
      { id: 'bi-1', category: BudgetCategory.PERSONNEL, name: '專案人員', quantity: 1, unit: '人', unitPrice: 380000, totalPrice: 380000, description: '全年度執行' }
    ], 
    grants: [
      { 
        stage: '第 1 期撥款', 
        documents: [
          { name: '切結書', status: '已完成' },
          { name: '契約書', status: '已完成' },
          { name: '第一期收據', status: '已完成' }
        ], 
        submissionDate: '115年1月31日', 
        deadline: '115年2月15日', 
        mocFinalCheck: '符合' as MOCCheckStatus 
      }
    ],
    coachingRecords: [],
    status: ProjectStatus.ONGOING,
    progress: 45,
    startDate: '2025-12-26',
    endDate: '2026-12-05',
    spent: 380000,
    budget: 850000
  }
];

