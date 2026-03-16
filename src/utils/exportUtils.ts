import { Project, CoachingRecord, MonthlyReport, GrantStage } from '../types';

// 匯出為 CSV
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 處理包含逗號或換行的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

// 匯出計畫清單
export const exportProjectList = (projects: Project[]) => {
  const data = projects.map(p => ({
    '計畫編號': p.projectCode || '',
    '計畫名稱': p.name,
    '執行單位': p.executingUnit,
    '計畫類型': p.category,
    '實施地點': p.sites?.join(', ') || '',
    '核定金額': p.approvedAmount,
    '已執行金額': p.spent,
    '執行進度': `${p.progress}%`,
    '計畫狀態': p.status,
    '計畫代表人': p.representative?.name || '',
    '計畫聯絡人': p.liaison?.name || '',
    '聯絡人Email': p.liaison?.email || '',
    '開始日期': p.startDate,
    '結束日期': p.endDate
  }));
  exportToCSV(data, '計畫清單');
};

// 匯出月報資料
export const exportMonthlyReports = (reports: MonthlyReport[], projects: Project[]) => {
  const data = reports.map(r => {
    const project = projects.find(p => p.id === r.projectId);
    const totalExpenditure = r.expenditures?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    return {
      '月報編號': r.id || '',
      '計畫名稱': project?.name || '',
      '填報月份': r.month,
      '本月支出金額': totalExpenditure,
      '成果說明': r.summary || '',
      '提交時間': r.submittedAt || ''
    };
  });
  exportToCSV(data, '月報資料');
};

// 匯出輔導紀錄
export const exportCoachingRecords = (records: CoachingRecord[], projects: Project[]) => {
  const data = records.map(r => {
    const project = projects.find(p => p.id === r.projectId);
    return {
      '紀錄編號': r.serialNumber,
      '計畫名稱': project?.name || '',
      '輔導日期': r.date,
      '輔導次數': r.frequency,
      '輔導方式': r.method,
      '輔導地點': r.location,
      '填寫人': r.writer,
      '整體訪視重點': r.keyPoints || '',
      '計畫執行進度': r.overallResults?.progress?.status || '',
      '計畫執行內容': r.overallResults?.content?.status || '',
      '執行紀錄完善': r.overallResults?.records?.status || '',
      '核銷憑證完備': r.overallResults?.vouchers?.status || ''
    };
  });
  exportToCSV(data, '輔導紀錄');
};

// 匯出撥付進度
export const exportGrantProgress = (projects: Project[]) => {
  const data: any[] = [];
  projects.forEach(p => {
    p.grants?.forEach(grant => {
      data.push({
        '計畫名稱': p.name,
        '撥款期別': grant.stage,
        '檢送日期': grant.submissionDate || '',
        '截止日期': grant.deadline || '',
        '公文發出日期': grant.documentSentDate || '',
        '入帳日期': grant.paymentReceivedDate || '',
        '文化部檢核': grant.mocFinalCheck,
        '文件狀態': grant.documents?.map(d => `${d.name}:${d.status}`).join('; ') || ''
      });
    });
  });
  exportToCSV(data, '撥付進度');
};

// 下載 Blob
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 匯出為列印格式 (HTML)
export const exportToPrint = (title: string, content: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
          }
          h1 { text-align: center; font-size: 24px; margin-bottom: 30px; }
          h2 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #333; padding: 12px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .photo-grid img { width: 100%; height: 200px; object-fit: cover; border: 1px solid #ccc; }
          @media print { 
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${content}
        <div class="no-print" style="text-align: center; margin-top: 40px;">
          <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer;">列印</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};
