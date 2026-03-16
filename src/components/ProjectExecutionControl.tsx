
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, KeyResult, KRStatus, MonthlyReport, WorkItemReport, ExpenditureDetail, BudgetItem, BudgetCategory, CoachingRecord, FundingSource, UserRole } from '../types';
import { Save, ArrowLeft, Plus, Trash2, X, FileText, BarChart3, AlertTriangle, Paperclip, FileCheck, MessageSquare, DollarSign, Eye, ZoomIn, Loader2, Link2, ExternalLink, Clock, ChevronDown, Upload, Calendar, Target, TrendingUp, AlertCircle, CheckCircle2, FileDown, File } from 'lucide-react';

interface ProjectExecutionControlProps {
  projects: Project[];
  coachingRecords: CoachingRecord[];
  selectedProjectId?: string;
  initialReport?: MonthlyReport | null;
  allReports?: MonthlyReport[];  // 所有歷史月報，用於計算累計支出
  onBack: () => void;
  onSaveReport: (report: MonthlyReport) => void;
  userRole?: string;  // 用戶角色，用於控制權限
  assignedProjectIds?: string[];  // 輔導老師負責的計畫 ID 列表
}

const ProjectExecutionControl: React.FC<ProjectExecutionControlProps> = ({ 
  projects, 
  coachingRecords, 
  selectedProjectId, 
  initialReport, 
  allReports = [],
  onBack, 
  onSaveReport,
  userRole,
  assignedProjectIds = []
}) => {
  // 陣列防呆：PocketBase 或父層可能傳入 null/undefined，避免 .filter/.map/.reduce 對 null 呼叫導致 crash
  const safeCoachingRecords = Array.isArray(coachingRecords) ? coachingRecords : [];
  const safeAllReports = Array.isArray(allReports) ? allReports : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  // 權限控制（使用 UserRole enum）
  const isAdmin = userRole === UserRole.ADMIN;
  const isCoach = userRole === UserRole.COACH;
  const isOperator = userRole === UserRole.OPERATOR;
  
  // 輔導老師只能閱覽負責計畫的月報（不可編輯）
  const isReadOnly = isCoach;
  const [targetProjectId, setTargetProjectId] = useState(initialReport?.projectId || selectedProjectId || (safeProjects[0]?.id || ''));
  const [reportMonth, setReportMonth] = useState(initialReport?.month || '2026年01月');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'expenditure' | 'workItem'>('expenditure');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = useState<'image' | 'pdf' | 'word' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [viewingHistoryReport, setViewingHistoryReport] = useState<MonthlyReport | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareReports, setSelectedCompareReports] = useState<string[]>([]);
  
  const selectedProject = safeProjects.find(p => p.id === targetProjectId);
  const safeBudgetItems = selectedProject && Array.isArray(selectedProject.budgetItems) ? selectedProject.budgetItems : [];
  const pendingCoachingRecords = safeCoachingRecords.filter(r => r.projectId === targetProjectId && !r.operatorFeedback);
  
  // 從 visions 結構中取得所有 KR（防呆：visions/objectives/keyResults 可能為 null）
  const allKeyResults = useMemo(() => {
    if (!selectedProject) return [];
    const visions = Array.isArray(selectedProject.visions) ? selectedProject.visions : [];
    return visions.flatMap(v => {
      const objectives = Array.isArray(v?.objectives) ? v.objectives : [];
      return objectives.flatMap(obj => {
        const krs = Array.isArray(obj?.keyResults) ? obj.keyResults : [];
        return krs.map(kr => ({
          ...kr,
          objectiveTitle: obj?.title ?? '',
          visionTitle: v?.title ?? ''
        }));
      });
    });
  }, [selectedProject]);

  // 計算各預算科目的累計支出（金額防呆 Number()||0）
  const budgetSpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    const projectReports = safeAllReports.filter(r => r.projectId === targetProjectId);
    projectReports.forEach(report => {
      const exps = Array.isArray(report.expenditures) ? report.expenditures : [];
      exps.forEach(exp => {
        if (exp.budgetItemId) {
          const amt = Number(exp.amount) || 0;
          map[exp.budgetItemId] = (map[exp.budgetItemId] || 0) + amt;
        }
      });
    });
    return map;
  }, [safeAllReports, targetProjectId]);

  const [reportData, setReportData] = useState<Partial<MonthlyReport>>({
    id: initialReport?.id,
    projectId: initialReport?.projectId || targetProjectId,
    month: initialReport?.month || reportMonth,
    workItems: Array.isArray(initialReport?.workItems) ? initialReport.workItems : [],
    expenditures: Array.isArray(initialReport?.expenditures) ? initialReport.expenditures : [],
    fanpageLinks: Array.isArray(initialReport?.fanpageLinks) ? initialReport.fanpageLinks : [],
    summary: initialReport?.summary || ''
  });

  const [coachingFeedbacks, setCoachingFeedbacks] = useState<{[key: string]: string}>(() => {
    const initial: {[key: string]: string} = {};
    pendingCoachingRecords.forEach(r => {
      initial[r.id] = r.operatorFeedback || '';
    });
    return initial;
  });

  // 計算本月中報總額（金額防呆，防呆 reportData.expenditures 可能為 null）
  const currentMonthTotal = useMemo(() => {
    const exps = Array.isArray(reportData?.expenditures) ? reportData.expenditures : [];
    return exps.reduce((sum, exp) => sum + (Number(exp?.amount) || 0), 0);
  }, [reportData?.expenditures]);

  // 人事費上限檢查 (假設上限為核定金額的 30%)（金額防呆）
  const personnelBudgetLimit = selectedProject ? (Number(selectedProject.approvedAmount) || 0) * 0.3 : 0;
  const currentPersonnelSpent = useMemo(() => {
    const personnelItems = safeBudgetItems.filter(item => item.category === BudgetCategory.PERSONNEL);
    const personnelItemIds = personnelItems.map(item => item.id);
    const exps = Array.isArray(reportData?.expenditures) ? reportData.expenditures : [];
    return exps
      .filter(exp => personnelItemIds.includes(exp.budgetItemId))
      .reduce((sum, exp) => sum + (Number(exp?.amount) || 0), 0);
  }, [reportData?.expenditures, safeBudgetItems]);

  useEffect(() => {
    if (initialReport) {
      setReportData(initialReport);
    } else if (selectedProject) {
      setReportData({ 
        projectId: selectedProject.id, 
        month: reportMonth,
        workItems: [],
        expenditures: [],
        fanpageLinks: [],
        summary: ''
      });
    }
  }, [initialReport, selectedProject, reportMonth]);

  // 新增工作事項
  const addWorkItem = () => {
    const newItem: WorkItemReport = {
      id: `work-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      krId: '',
      executionNote: '',
      achievedValue: 0,
      attachments: []
    };
    setReportData(prev => ({
      ...prev,
      workItems: [...(prev.workItems || []), newItem]
    }));
  };

  const updateWorkItem = (id: string, field: keyof WorkItemReport, value: any) => {
    setReportData(prev => {
      const workItems = Array.isArray(prev.workItems) ? prev.workItems : [];
      return { ...prev, workItems: workItems.map(item => item.id === id ? { ...item, [field]: value } : item) };
    });
  };

  const removeWorkItem = (id: string) => {
    setReportData(prev => {
      const workItems = Array.isArray(prev.workItems) ? prev.workItems : [];
      return { ...prev, workItems: workItems.filter(item => item.id !== id) };
    });
  };

  // 新增支出明細
  const addExpenditure = () => {
    const newExp: ExpenditureDetail = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      budgetItemId: '',
      fundingSource: FundingSource.SUBSIDY,
      amount: 0,
      description: '',
      receiptUrls: []
    };
    setReportData(prev => ({
      ...prev,
      expenditures: [...(prev.expenditures || []), newExp]
    }));
  };

  const updateExpenditure = (id: string, field: keyof ExpenditureDetail, value: any) => {
    setReportData(prev => {
      const expenditures = Array.isArray(prev.expenditures) ? prev.expenditures : [];
      return { ...prev, expenditures: expenditures.map(exp => exp.id === id ? { ...exp, [field]: value } : exp) };
    });
  };

  const removeExpenditure = (id: string) => {
    setReportData(prev => {
      const expenditures = Array.isArray(prev.expenditures) ? prev.expenditures : [];
      return { ...prev, expenditures: expenditures.filter(exp => exp.id !== id) };
    });
  };

  // 檔案上傳處理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && activeUploadId) {
      setIsUploading(true);
      
      const readPromises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file as Blob);
        });
      });
      
      Promise.all(readPromises).then(newUrls => {
        setTimeout(() => {
          if (uploadType === 'expenditure') {
            const currentExp = reportData.expenditures?.find(exp => exp.id === activeUploadId);
            const existingUrls = currentExp?.receiptUrls || [];
            updateExpenditure(activeUploadId, 'receiptUrls', [...existingUrls, ...newUrls]);
          } else {
            const currentItem = reportData.workItems?.find(item => item.id === activeUploadId);
            const existingUrls = currentItem?.attachments || [];
            updateWorkItem(activeUploadId, 'attachments', [...existingUrls, ...newUrls]);
          }
          setActiveUploadId(null);
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 500);
      });
    }
  };

  const removeReceiptUrl = (expId: string, urlIndex: number) => {
    const exps = Array.isArray(reportData.expenditures) ? reportData.expenditures : [];
    const exp = exps.find(e => e.id === expId);
    if (exp && Array.isArray(exp.receiptUrls)) {
      const newUrls = exp.receiptUrls.filter((_, i) => i !== urlIndex);
      updateExpenditure(expId, 'receiptUrls', newUrls);
    }
  };

  const removeAttachment = (itemId: string, urlIndex: number) => {
    const workItems = Array.isArray(reportData.workItems) ? reportData.workItems : [];
    const item = workItems.find(i => i.id === itemId);
    if (item && Array.isArray(item.attachments)) {
      const newUrls = item.attachments.filter((_, i) => i !== urlIndex);
      updateWorkItem(itemId, 'attachments', newUrls);
    }
  };

  // 判斷檔案類型
  const getFileType = (url: string): 'image' | 'pdf' | 'word' => {
    if (url.startsWith('data:image/')) return 'image';
    if (url.startsWith('data:application/pdf')) return 'pdf';
    if (url.startsWith('data:application/msword') || url.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document')) return 'word';
    // 根據副檔名判斷
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf')) return 'pdf';
    if (lowerUrl.includes('.doc') || lowerUrl.includes('.docx')) return 'word';
    return 'image';
  };

  // 處理檔案預覽
  const handleFilePreview = (url: string) => {
    const fileType = getFileType(url);
    setPreviewFileType(fileType);
    setPreviewImageUrl(url);
  };

  // 渲染附件縮圖
  const renderAttachmentThumbnail = (url: string, idx: number, onRemove: () => void) => {
    const fileType = getFileType(url);
    return (
      <div key={idx} className="relative group">
        <div 
          className="w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 bg-white cursor-pointer hover:border-blue-400 transition-all flex items-center justify-center"
          onClick={() => handleFilePreview(url)}
        >
          {fileType === 'image' ? (
            <img src={url} className="w-full h-full object-cover" alt="附件" />
          ) : fileType === 'pdf' ? (
            <div className="flex flex-col items-center justify-center text-red-500">
              <FileText size={32} />
              <span className="text-xs mt-1 font-bold">PDF</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-blue-500">
              <File size={32} />
              <span className="text-xs mt-1 font-bold">Word</span>
            </div>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  // 依 budgetItemId 取得預算科目名稱（ExpenditureDetail 無 item 欄位）
  const getBudgetItemName = (budgetItemId: string) =>
    safeBudgetItems.find(b => b.id === budgetItemId)?.name || '未指定';

  // 取得預算科目的剩餘餘額（金額防呆）
  const getBudgetRemaining = (budgetItemId: string) => {
    const item = safeBudgetItems.find(b => b.id === budgetItemId);
    if (!item) return 0;
    const spent = Number(budgetSpentMap[budgetItemId]) || 0;
    return (Number(item.totalPrice) || 0) - spent;
  };

  // 取得 KR 的預定目標值
  const getKRTargetValue = (krId: string) => {
    const kr = allKeyResults.find(k => k.id === krId);
    return kr?.targetValue || 0;
  };

  // 匯出單一歷史月報為 Word
  const exportSingleReportToWord = (report: MonthlyReport) => {
    if (!selectedProject || !report) return;

    const workItemsHtml = (Array.isArray(report.workItems) ? report.workItems : []).map((item, idx) => {
      const kr = allKeyResults.find(k => k.id === item.krId);
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${kr?.description || '未指定'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.executionNote || ''}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.achievedValue || 0}</td>
        </tr>
      `;
    }).join('') || '';

    const expendituresHtml = (Array.isArray(report.expenditures) ? report.expenditures : []).map((exp, idx) => {
      const budgetItem = safeBudgetItems.find(b => b.id === exp.budgetItemId);
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${budgetItem?.name || '未指定'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${exp.fundingSource === FundingSource.SUBSIDY ? '補助款' : '自籌款'}</td>
          <td style="border: 1px solid #000; padding: 8px;">$${(Number(exp.amount) || 0).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 8px;">${exp.description || ''}</td>
        </tr>
      `;
    }).join('') || '';

    const totalAmount = report.expenditures?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>月報表 - ${selectedProject.name} - ${report.month}</title>
        <style>
          body { font-family: '微軟正黑體', 'Microsoft JhengHei', sans-serif; padding: 40px; }
          h1 { text-align: center; color: #1e40af; margin-bottom: 30px; }
          h2 { color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f1f5f9; border: 1px solid #000; padding: 10px; text-align: left; }
          .info-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 10px; }
          .info-label { font-weight: bold; width: 120px; }
          .total { font-size: 18px; font-weight: bold; color: #059669; text-align: right; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>文化部原村計畫 月報表</h1>
        
        <div class="info-section">
          <div class="info-row"><span class="info-label">計畫名稱：</span><span>${selectedProject.name}</span></div>
          <div class="info-row"><span class="info-label">計畫編號：</span><span>${selectedProject.id}</span></div>
          <div class="info-row"><span class="info-label">報告月份：</span><span>${report.month}</span></div>
          <div class="info-row"><span class="info-label">提交時間：</span><span>${report.submittedAt || '-'}</span></div>
        </div>

        <h2>一、工作事項執行情形</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">序號</th>
              <th>對應關鍵結果 (KR)</th>
              <th>執行說明</th>
              <th style="width: 100px;">達成值</th>
            </tr>
          </thead>
          <tbody>
            ${workItemsHtml || '<tr><td colspan="4" style="border: 1px solid #000; padding: 20px; text-align: center; color: #94a3b8;">尚無工作事項</td></tr>'}
          </tbody>
        </table>

        <h2>二、經費支出明細</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">序號</th>
              <th>預算科目</th>
              <th style="width: 100px;">經費來源</th>
              <th style="width: 120px;">支出金額</th>
              <th>支出說明</th>
            </tr>
          </thead>
          <tbody>
            ${expendituresHtml || '<tr><td colspan="5" style="border: 1px solid #000; padding: 20px; text-align: center; color: #94a3b8;">尚無支出項目</td></tr>'}
          </tbody>
        </table>
        <p class="total">本月申報總額：$${totalAmount.toLocaleString()}</p>

        ${Array.isArray(report.fanpageLinks) && report.fanpageLinks.length > 0 ? `
          <h2>三、原村粉絲頁貼文連結</h2>
          <ul>
            ${report.fanpageLinks.map(link => `<li><a href="${link}">${link}</a></li>`).join('')}
          </ul>
        ` : ''}

        ${report.summary ? `
          <h2>四、成果說明</h2>
          <p>${report.summary}</p>
        ` : ''}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `月報表_${selectedProject.name}_${report.month?.replace(/\s/g, '')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 匯出 Word 檔案功能
  const exportToWord = () => {
    if (!selectedProject || !reportData) return;

    // 建立 Word 文件內容
    const workItemsHtml = (Array.isArray(reportData.workItems) ? reportData.workItems : []).map((item, idx) => {
      const kr = allKeyResults.find(k => k.id === item.krId);
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${kr?.description || '未指定'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.executionNote || ''}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.achievedValue || 0}</td>
        </tr>
      `;
    }).join('') || '';

    const expendituresHtml = (Array.isArray(reportData.expenditures) ? reportData.expenditures : []).map((exp, idx) => {
      const budgetItem = safeBudgetItems.find(b => b.id === exp.budgetItemId);
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${budgetItem?.name || '未指定'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${exp.fundingSource === FundingSource.SUBSIDY ? '補助款' : '自籌款'}</td>
          <td style="border: 1px solid #000; padding: 8px;">$${(Number(exp.amount) || 0).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 8px;">${exp.description || ''}</td>
        </tr>
      `;
    }).join('') || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>月報表 - ${selectedProject.name} - ${reportData.month}</title>
        <style>
          body { font-family: '微軟正黑體', 'Microsoft JhengHei', sans-serif; padding: 40px; }
          h1 { text-align: center; color: #1e40af; margin-bottom: 30px; }
          h2 { color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f1f5f9; border: 1px solid #000; padding: 10px; text-align: left; }
          .info-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 10px; }
          .info-label { font-weight: bold; width: 120px; }
          .total { font-size: 18px; font-weight: bold; color: #059669; text-align: right; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>文化部原村計畫 月報表</h1>
        
        <div class="info-section">
          <div class="info-row"><span class="info-label">計畫名稱：</span><span>${selectedProject.name}</span></div>
          <div class="info-row"><span class="info-label">計畫編號：</span><span>${selectedProject.id}</span></div>
          <div class="info-row"><span class="info-label">報告月份：</span><span>${reportData.month}</span></div>
          <div class="info-row"><span class="info-label">匯出時間：</span><span>${new Date().toLocaleString('zh-TW')}</span></div>
        </div>

        <h2>一、工作事項執行情形</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">序號</th>
              <th>對應關鍵結果 (KR)</th>
              <th>執行說明</th>
              <th style="width: 100px;">達成值</th>
            </tr>
          </thead>
          <tbody>
            ${workItemsHtml || '<tr><td colspan="4" style="border: 1px solid #000; padding: 20px; text-align: center; color: #94a3b8;">尚無工作事項</td></tr>'}
          </tbody>
        </table>

        <h2>二、經費支出明細</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">序號</th>
              <th>預算科目</th>
              <th style="width: 100px;">經費來源</th>
              <th style="width: 120px;">支出金額</th>
              <th>支出說明</th>
            </tr>
          </thead>
          <tbody>
            ${expendituresHtml || '<tr><td colspan="5" style="border: 1px solid #000; padding: 20px; text-align: center; color: #94a3b8;">尚無支出項目</td></tr>'}
          </tbody>
        </table>
        <p class="total">本月申報總額：$${currentMonthTotal.toLocaleString()}</p>

        ${Array.isArray(reportData.fanpageLinks) && reportData.fanpageLinks.length > 0 ? `
          <h2>三、原村粉絲頁貼文連結</h2>
          <ul>
            ${reportData.fanpageLinks.map(link => `<li><a href="${link}">${link}</a></li>`).join('')}
          </ul>
        ` : ''}

        ${reportData.summary ? `
          <h2>四、備註</h2>
          <p>${reportData.summary}</p>
        ` : ''}
      </body>
      </html>
    `;

    // 建立 Blob 並下載
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `月報表_${selectedProject.name}_${reportData.month?.replace(/\s/g, '')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!selectedProject) return <div className="p-10 text-center text-gray-400 font-bold">計畫載入中...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* 燈箱 Modal - 支援圖片、PDF、Word 預覽 */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setPreviewImageUrl(null); setPreviewFileType(null); }}>
           <button className="absolute top-8 right-8 p-4 text-white/50 hover:text-white transition-colors">
              <X size={48} />
           </button>
           <div className="relative max-w-full max-h-full flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
              {previewFileType === 'image' ? (
                <img 
                  src={previewImageUrl} 
                  className="max-w-full max-h-[80vh] object-contain shadow-[0_0_100px_rgba(255,255,255,0.1)] rounded-xl border border-white/10"
                  alt="Preview"
                />
              ) : previewFileType === 'pdf' ? (
                <div className="w-full max-w-4xl h-[80vh] bg-white rounded-xl overflow-hidden">
                  <iframe 
                    src={previewImageUrl} 
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl p-12 text-center">
                  <File size={80} className="mx-auto text-blue-500 mb-6" />
                  <p className="text-xl font-bold text-slate-800 mb-4">Word 文件預覽</p>
                  <p className="text-slate-500 mb-6">Word 檔案無法直接在瀏覽器中預覽</p>
                  <a 
                    href={previewImageUrl} 
                    download="document.docx"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    <FileDown size={20} /> 下載檔案
                  </a>
                </div>
              )}
           </div>
        </div>
      )}

      {/* 頁首 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <FileText size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight">月報填報</h1>
                {isReadOnly && (
                  <span className="px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-black">
                    唯讀模式
                  </span>
                )}
              </div>
              <p className="text-blue-100 text-sm mt-1">
                {isReadOnly ? '輔導老師僅可閱覽月報內容，不可編輯' : '系統已全面更新至 v1.1 (包含經費核銷與預算追蹤)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={exportToWord}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
              title="匯出 Word 檔案"
            >
              <FileDown size={20} /> 匯出 Word
            </button>
            <button onClick={onBack} className="p-3 hover:bg-white/20 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* 選擇專案與月份 + 本月申報總額 */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-bold text-slate-500 w-24">選擇專案：</label>
              <select 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                disabled={isReadOnly}
              >
                {safeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-bold text-slate-500 w-24">填報月份：</label>
              <input 
                type="month"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                value={reportMonth.replace('年', '-').replace('月', '')}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setReportMonth(`${year}年${month}月`);
                }}
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400 mb-2">本月申報總額</p>
            <p className="text-5xl font-black text-blue-600">${currentMonthTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('current')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'current' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText size={18} /> 當月填報
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Clock size={18} /> 歷史紀錄
        </button>
      </div>

      {activeTab === 'current' && (
        <>
          {/* 成果說明 */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                <FileText size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800">成果說明</h2>
            </div>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 min-h-[120px] outline-none font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder="請摘要描述本月整體執行成果與重要事項..."
              value={reportData.summary || ''}
              onChange={(e) => setReportData(prev => ({ ...prev, summary: e.target.value }))}
              disabled={isReadOnly}
            />
          </section>

          {/* 工作事項與支出明細 */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">工作事項與支出明細</h2>
              {!isReadOnly && (
                <button 
                  onClick={addWorkItem}
                  className="px-5 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Plus size={18} /> 新增工作事項
                </button>
              )}
            </div>

            {/* 工作事項列表 */}
            <div className="space-y-6">
              {(Array.isArray(reportData.workItems) ? reportData.workItems : []).map((item, index) => {
                const selectedKR = allKeyResults.find(kr => kr.id === item.krId);
                return (
                  <div key={item.id} className="bg-slate-50 rounded-2xl p-6 space-y-5 border border-slate-100 relative">
                    {!isReadOnly && (
                      <button 
                        onClick={() => removeWorkItem(item.id)}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      {/* 對應工作項目（關鍵結果 KR） */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">對應工作項目（關鍵結果 KR）</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          value={item.krId}
                          onChange={(e) => updateWorkItem(item.id, 'krId', e.target.value)}
                          disabled={isReadOnly}
                        >
                          <option value="">請選擇關鍵結果 (KR)</option>
                          {allKeyResults.map(kr => (
                            <option key={kr.id} value={kr.id}>
                              [{kr.visionTitle} / {kr.objectiveTitle}] {kr.description}
                            </option>
                          ))}
                        </select>
                        {selectedKR && (
                          <p className="text-xs text-blue-600 font-medium pl-1">
                            預定目標值：{selectedKR.targetValue} | 預計完成日：{selectedKR.expectedDate}
                          </p>
                        )}
                      </div>

                      {/* 當月達成比例 */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">當月達成比例</label>
                        <input 
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          placeholder="0"
                          value={item.achievedValue || ''}
                          onChange={(e) => updateWorkItem(item.id, 'achievedValue', Number(e.target.value))}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>

                    {/* 執行內容說明 */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">執行內容說明</label>
                      <textarea 
                        className="w-full bg-white border border-slate-200 rounded-xl p-4 min-h-[100px] outline-none font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                        placeholder="請描述本月執行之具體內容..."
                        value={item.executionNote}
                        onChange={(e) => updateWorkItem(item.id, 'executionNote', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* 上傳單據/附件 */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">上傳單據 / 附件（支援圖片、PDF、Word）</label>
                      <div className="flex flex-wrap gap-3">
                        {item.attachments?.map((url, idx) => 
                          renderAttachmentThumbnail(url, idx, () => !isReadOnly && removeAttachment(item.id, idx))
                        )}
                        {!isReadOnly && (
                          <button 
                            onClick={() => { setActiveUploadId(item.id); setUploadType('workItem'); fileInputRef.current?.click(); }}
                            className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                          >
                            <Plus size={24} />
                            <span className="text-xs mt-1">新增</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {(!reportData.workItems || reportData.workItems.length === 0) && (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Target size={48} className="mx-auto mb-4 text-slate-200" />
                  <p className="font-bold">尚未新增工作事項</p>
                  <p className="text-sm mt-1">點擊上方按鈕新增本月執行的工作項目</p>
                </div>
              )}
            </div>
          </section>

          {/* 預算執行 (支出明細) */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                  <DollarSign size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800">預算執行</h2>
              </div>
{!isReadOnly && (
                <button 
                  onClick={addExpenditure}
                  className="px-5 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold text-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Plus size={18} /> 新增支出項目
                </button>
              )}
            </div>

            {/* 人事費上限警示 */}
            {currentPersonnelSpent > personnelBudgetLimit * 0.8 && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${currentPersonnelSpent > personnelBudgetLimit ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                <AlertCircle size={20} className={currentPersonnelSpent > personnelBudgetLimit ? 'text-red-500' : 'text-amber-500'} />
                <div>
                  <p className={`font-bold ${currentPersonnelSpent > personnelBudgetLimit ? 'text-red-700' : 'text-amber-700'}`}>
                    {currentPersonnelSpent > personnelBudgetLimit ? '人事費已超過上限！' : '人事費即將達到上限'}
                  </p>
                  <p className="text-sm text-slate-600">
                    目前人事費支出：${currentPersonnelSpent.toLocaleString()} / 上限：${personnelBudgetLimit.toLocaleString()} (核定金額的 30%)
                  </p>
                </div>
              </div>
            )}

            {/* 支出明細列表 */}
            <div className="space-y-4">
              {(Array.isArray(reportData.expenditures) ? reportData.expenditures : []).map((exp) => {
                const budgetItem = safeBudgetItems.find(b => b.id === exp.budgetItemId);
                const remaining = getBudgetRemaining(exp.budgetItemId);
                const isOverBudget = (Number(exp.amount) || 0) > remaining;
                
                return (
                  <div key={exp.id} className={`bg-slate-50 rounded-2xl p-6 space-y-5 border ${isOverBudget ? 'border-red-300 bg-red-50/30' : 'border-slate-100'} relative`}>
                    {!isReadOnly && (
                      <button 
                        onClick={() => removeExpenditure(exp.id)}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      {/* 對應預算科目 - 下拉選單連動計畫書預算 */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">對應預算內容</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          value={exp.budgetItemId}
                          onChange={(e) => updateExpenditure(exp.id, 'budgetItemId', e.target.value)}
                          disabled={isReadOnly}
                        >
                          <option value="">請選擇預算科目</option>
                          <optgroup label="人事費">
                            {safeBudgetItems.filter(b => b.category === BudgetCategory.PERSONNEL).map(b => (
                              <option key={b.id} value={b.id}>{b.name} (核定: ${(Number(b.totalPrice) || 0).toLocaleString()})</option>
                            ))}
                          </optgroup>
                          <optgroup label="業務費">
                            {safeBudgetItems.filter(b => b.category === BudgetCategory.OPERATING).map(b => (
                              <option key={b.id} value={b.id}>{b.name} (核定: ${(Number(b.totalPrice) || 0).toLocaleString()})</option>
                            ))}
                          </optgroup>
                          <optgroup label="雜支">
                            {safeBudgetItems.filter(b => b.category === BudgetCategory.MISCELLANEOUS).map(b => (
                              <option key={b.id} value={b.id}>{b.name} (核定: ${(Number(b.totalPrice) || 0).toLocaleString()})</option>
                            ))}
                          </optgroup>
                        </select>
                        {budgetItem && (
                          <p className={`text-xs font-medium pl-1 ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                            剩餘餘額：${remaining.toLocaleString()} {isOverBudget && '(超支！)'}
                          </p>
                        )}
                      </div>

                      {/* 經費來源 */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">經費來源</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          value={exp.fundingSource}
                          onChange={(e) => updateExpenditure(exp.id, 'fundingSource', e.target.value as FundingSource)}
                          disabled={isReadOnly}
                        >
                          <option value={FundingSource.SUBSIDY}>補助款</option>
                          <option value={FundingSource.SELF_FUNDED}>自籌款</option>
                        </select>
                      </div>

                      {/* 本月支出金額 */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">本月支出金額</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input 
                            type="number"
                            className={`w-full bg-white border rounded-xl pl-8 pr-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed ${isOverBudget ? 'border-red-300 text-red-600' : 'border-slate-200 text-slate-700'}`}
                            placeholder="0"
                            value={exp.amount || ''}
                            onChange={(e) => updateExpenditure(exp.id, 'amount', Number(e.target.value))}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 支出說明 */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">支出說明</label>
                      <input 
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        placeholder="請簡述支出用途..."
                        value={exp.description}
                        onChange={(e) => updateExpenditure(exp.id, 'description', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* 上傳憑證 */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">上傳憑證 / 發票（支援圖片、PDF、Word）</label>
                      <div className="flex flex-wrap gap-3">
                        {exp.receiptUrls?.map((url, idx) => 
                          renderAttachmentThumbnail(url, idx, () => !isReadOnly && removeReceiptUrl(exp.id, idx))
                        )}
                        {!isReadOnly && (
                          <button 
                            onClick={() => { setActiveUploadId(exp.id); setUploadType('expenditure'); fileInputRef.current?.click(); }}
                            className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all"
                          >
                            <Plus size={24} />
                            <span className="text-xs mt-1">新增</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {(!reportData.expenditures || reportData.expenditures.length === 0) && (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  <DollarSign size={48} className="mx-auto mb-4 text-slate-200" />
                  <p className="font-bold">尚未新增支出項目</p>
                  <p className="text-sm mt-1">點擊上方按鈕新增本月的支出明細</p>
                </div>
              )}
            </div>
          </section>

          {/* 原村粉絲頁上傳紀錄 */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                  <Link2 size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800">原村粉絲頁上傳紀錄</h2>
              </div>
{!isReadOnly && (
                <button 
                  onClick={() => {
                    setReportData(prev => ({
                      ...prev,
                      fanpageLinks: [...(prev.fanpageLinks || []), '']
                    }));
                  }}
                  className="px-5 py-2.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl font-bold text-sm hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Plus size={18} /> 新增貼文連結
                </button>
              )}
            </div>

            <div className="space-y-3">
              {(Array.isArray(reportData.fanpageLinks) ? reportData.fanpageLinks : []).map((link, index) => (
                <div key={index} className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-500">
                    <Link2 size={18} />
                  </div>
                  <input 
                    type="url"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="請貼上原村粉絲頁貼文連結 (https://www.facebook.com/...)"
                    value={link}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      const newLinks = [...(reportData.fanpageLinks || [])];
                      newLinks[index] = e.target.value;
                      setReportData(prev => ({ ...prev, fanpageLinks: newLinks }));
                    }}
                    disabled={isReadOnly}
                  />
                  {link && (
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
{!isReadOnly && (
                    <button 
                      onClick={() => {
                        const newLinks = (Array.isArray(reportData.fanpageLinks) ? reportData.fanpageLinks : []).filter((_, i) => i !== index);
                        setReportData(prev => ({ ...prev, fanpageLinks: newLinks }));
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}

              {(!reportData.fanpageLinks || reportData.fanpageLinks.length === 0) && (
                <div className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <Link2 size={36} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-bold text-sm">尚未新增粉絲頁貼文連結</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'history' && !viewingHistoryReport && (
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                <Clock size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800">提交歷史紀錄</h2>
            </div>
            <div className="flex gap-3">
              {selectedCompareReports.length >= 2 && (
                <button
                  onClick={() => setCompareMode(true)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl font-bold text-sm hover:bg-purple-600 transition-all flex items-center gap-2"
                >
                  <BarChart3 size={16} /> 比較已選 ({selectedCompareReports.length})
                </button>
              )}
              {selectedCompareReports.length > 0 && (
                <button
                  onClick={() => setSelectedCompareReports([])}
                  className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all"
                >
                  清除選擇
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4 text-center rounded-l-xl w-12">選擇</th>
                  <th className="px-6 py-4 text-left">日份</th>
                  <th className="px-6 py-4 text-left">專案名稱</th>
                  <th className="px-6 py-4 text-left">申報金額</th>
                  <th className="px-6 py-4 text-left">提交時間</th>
                  <th className="px-6 py-4 text-center rounded-r-xl">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allReports.filter(r => r.projectId === targetProjectId && r.submittedAt && !r.isDraft).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      尚無歷史紀錄
                    </td>
                  </tr>
                ) : (
                  allReports.filter(r => r.projectId === targetProjectId && r.submittedAt && !r.isDraft).map(report => {
                    const total = report.expenditures?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;
                    const isSelected = selectedCompareReports.includes(report.id!);
                    return (
                      <tr key={report.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedCompareReports(prev => prev.filter(id => id !== report.id));
                              } else {
                                setSelectedCompareReports(prev => [...prev, report.id!]);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{report.month}</td>
                        <td className="px-6 py-4 text-slate-600">{selectedProject?.name}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600">${total.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-500">{report.submittedAt || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setViewingHistoryReport(report)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                              title="查看詳情"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => exportSingleReportToWord(report)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                              title="匯出 Word"
                            >
                              <FileDown size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 查看歷史月報詳情 */}
      {activeTab === 'history' && viewingHistoryReport && !compareMode && (
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewingHistoryReport(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-800">{viewingHistoryReport.month} 月報詳情</h2>
                <p className="text-sm text-slate-500">提交時間：{viewingHistoryReport.submittedAt}</p>
              </div>
            </div>
            <button
              onClick={() => exportSingleReportToWord(viewingHistoryReport)}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
            >
              <FileDown size={16} /> 匯出 Word
            </button>
          </div>

          {/* 成果說明 */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" /> 成果說明
            </h3>
            <p className="text-slate-600 whitespace-pre-wrap">{viewingHistoryReport.summary || '無'}</p>
          </div>

          {/* 工作事項 */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Target size={18} className="text-amber-500" /> 工作事項
            </h3>
            <div className="space-y-4">
              {(Array.isArray(viewingHistoryReport.workItems) ? viewingHistoryReport.workItems : []).map((item, idx) => {
                const kr = allKeyResults.find(k => k.id === item.krId);
                return (
                  <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800">{kr?.description || `工作項目 ${idx + 1}`}</span>
                      <span className="text-sm font-bold text-blue-600">達成 {item.achievedValue}%</span>
                    </div>
                    <p className="text-sm text-slate-600">{item.executionNote}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 支出明細 */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-500" /> 支出明細
            </h3>
            <table className="w-full">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left py-2">項目</th>
                  <th className="text-left py-2">說明</th>
                  <th className="text-right py-2">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(Array.isArray(viewingHistoryReport.expenditures) ? viewingHistoryReport.expenditures : []).map(exp => (
                  <tr key={exp.id}>
                    <td className="py-3 font-bold text-slate-700">{getBudgetItemName(exp.budgetItemId)}</td>
                    <td className="py-3 text-slate-600">{exp.description}</td>
                    <td className="py-3 text-right font-bold text-emerald-600">${(Number(exp.amount) || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="py-3 font-black text-slate-800">總計</td>
                  <td className="py-3 text-right font-black text-emerald-600 text-lg">
                    ${((Array.isArray(viewingHistoryReport.expenditures) ? viewingHistoryReport.expenditures : []).reduce((sum, e) => sum + (Number(e?.amount) || 0), 0)).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* 比較模式 */}
      {activeTab === 'history' && compareMode && (
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setCompareMode(false); setSelectedCompareReports([]); }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-800">月報比較分析</h2>
                <p className="text-sm text-slate-500">比較 {selectedCompareReports.length} 份月報的執行情況</p>
              </div>
            </div>
          </div>

          {/* 比較表格 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">比較項目</th>
                  {selectedCompareReports.map(id => {
                    const report = safeAllReports.find(r => r.id === id);
                    return <th key={id} className="px-4 py-3 text-center">{report?.month}</th>;
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-4 font-bold text-slate-700">申報金額</td>
                  {selectedCompareReports.map(id => {
                    const report = safeAllReports.find(r => r.id === id);
                    const exps = Array.isArray(report?.expenditures) ? report!.expenditures : [];
                    const total = exps.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
                    return <td key={id} className="px-4 py-4 text-center font-bold text-emerald-600">${total.toLocaleString()}</td>;
                  })}
                </tr>
                <tr>
                  <td className="px-4 py-4 font-bold text-slate-700">工作項目數</td>
                  {selectedCompareReports.map(id => {
                    const report = safeAllReports.find(r => r.id === id);
                    return <td key={id} className="px-4 py-4 text-center font-bold text-blue-600">{Array.isArray(report?.workItems) ? report!.workItems.length : 0}</td>;
                  })}
                </tr>
                <tr>
                  <td className="px-4 py-4 font-bold text-slate-700">支出項目數</td>
                  {selectedCompareReports.map(id => {
                    const report = safeAllReports.find(r => r.id === id);
                    return <td key={id} className="px-4 py-4 text-center font-bold text-amber-600">{Array.isArray(report?.expenditures) ? report!.expenditures.length : 0}</td>;
                  })}
                </tr>
                <tr>
                  <td className="px-4 py-4 font-bold text-slate-700">提交時間</td>
                  {selectedCompareReports.map(id => {
                    const report = safeAllReports.find(r => r.id === id);
                    return <td key={id} className="px-4 py-4 text-center text-slate-500 text-sm">{report?.submittedAt}</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 支出趨勢圖 */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-bold text-slate-700 mb-4">支出趨勢</h3>
            <div className="flex items-end gap-4 h-48">
              {selectedCompareReports.map(id => {
                const report = safeAllReports.find(r => r.id === id);
                const exps = Array.isArray(report?.expenditures) ? report!.expenditures : [];
                const total = exps.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
                const maxTotal = Math.max(0, ...selectedCompareReports.map(rid => {
                  const r = safeAllReports.find(rep => rep.id === rid);
                  const es = Array.isArray(r?.expenditures) ? r!.expenditures : [];
                  return es.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
                }));
                const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                return (
                  <div key={id} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${height}%`, minHeight: '20px' }}
                    />
                    <p className="mt-2 text-xs font-bold text-slate-600">{report?.month}</p>
                    <p className="text-xs text-emerald-600">${total.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileSelect} 
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
        multiple
      />

      {/* 底部提交按鈕 - 唯讀模式下隱藏 */}
      {!isReadOnly && (
        <div className="fixed bottom-8 right-8 z-40 flex gap-4">
          <button 
            onClick={() => {
              // 儲存草稿 - 不設定 submittedAt，表示還是草稿狀態
              const draftReport: MonthlyReport = {
                ...reportData as MonthlyReport,
                isDraft: true,
                savedAt: new Date().toLocaleString('zh-TW')
              };
              onSaveReport(draftReport);
              alert('草稿已儲存！您可以稍後繼續編輯。');
            }}
            className="px-8 py-4 bg-white text-slate-700 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border border-slate-200"
          >
            <Save size={20} /> 儲存草稿
          </button>
          <button 
            onClick={() => {
              if (confirm('確定要提交月報嗎？提交後將無法再修改。')) {
                const finalReport: MonthlyReport = {
                  ...reportData as MonthlyReport,
                  isDraft: false,
                  submittedAt: new Date().toLocaleString('zh-TW')
                };
                onSaveReport(finalReport);
                alert('月報已成功提交！');
              }
            }}
            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={20} /> 提交月報
          </button>
        </div>
      )}

      {/* 唯讀模式提示 */}
      {isReadOnly && (
        <div className="fixed bottom-8 right-8 z-40">
          <div className="px-6 py-3 bg-amber-100 text-amber-800 rounded-2xl font-bold shadow-lg flex items-center gap-2 border border-amber-200">
            <Eye size={20} /> 唯讀模式 - 輔導老師僅可閱覽月報內容
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectExecutionControl;
