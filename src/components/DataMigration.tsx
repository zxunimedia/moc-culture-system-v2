
import React, { useState, useRef } from 'react';
import { Download, Upload, CheckCircle2, AlertTriangle, FileJson, ArrowRightLeft, Loader2, Database, ArrowLeft } from 'lucide-react';
import { Project, MonthlyReport, CoachingRecord } from '../types';

interface DataMigrationProps {
  projects: Project[];
  monthlyReports: MonthlyReport[];
  coachingRecords: CoachingRecord[];
  onImport: (data: any) => void;
  onBack?: () => void;
}

const DataMigration: React.FC<DataMigrationProps> = ({ projects, monthlyReports, coachingRecords, onImport, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'none', message: string }>({ type: 'none', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    setIsExporting(true);
    // 模擬處理延遲以提供回饋感
    setTimeout(() => {
      const dataToExport = {
        version: "1.3.5",
        exportDate: new Date().toISOString(),
        data: {
          projects,
          monthlyReports,
          coachingRecords
        }
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MOC_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 1200);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: 'none', message: '' });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // 驗證 JSON 結構
        if (!json.data || !Array.isArray(json.data.projects)) {
          throw new Error("格式錯誤：找不到有效的計畫案列表。");
        }
        
        // 成功匯入處理
        setTimeout(() => {
          onImport(json.data);
          setImportStatus({ 
            type: 'success', 
            message: `資料對接完成！已同步匯入 ${json.data.projects.length} 個計畫案與其關聯之月報、輔導紀錄。` 
          });
          setIsImporting(false);
        }, 1500);
      } catch (err: any) {
        setImportStatus({ type: 'error', message: err.message || "解析失敗：請提供由本系統產出的 JSON 備份包。" });
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    // 清除 value 讓同檔案可以重複觸發
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-500">
      {/* 返回按鈕 */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>返回主頁</span>
        </button>
      )}
      
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-slate-900 text-amber-400 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl">
           <Database size={48} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">系統資料遷移中心</h2>
        <p className="text-slate-400 font-bold text-lg max-w-xl mx-auto">
          實現不同帳號或系統間的資料對接，利用 <span className="text-slate-800">Project UUID</span> 自動判別並關聯所有歷史紀錄。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 匯出卡片 */}
        <div className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-xl hover:shadow-blue-500/5 transition-all group border-b-8 border-b-blue-600">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-all duration-500">
            <Download size={40} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">完整資料匯出</h3>
          <p className="text-slate-500 text-sm font-bold leading-relaxed mb-10">
            將目前系統內所有的計畫、月報與輔導紀錄封裝為單一 JSON 整合包。此檔案可用於異地備份或移轉至新管考年度系統中。
          </p>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-5 bg-[#2D3E50] text-white rounded-[24px] font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" /> : <FileJson size={24} />}
            {isExporting ? '封裝處理中...' : '下載完整備份包'}
          </button>
        </div>

        {/* 匯入卡片 */}
        <div className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-xl hover:shadow-amber-500/5 transition-all group border-b-8 border-b-amber-500">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-600 mb-8 group-hover:scale-110 transition-all duration-500">
            <Upload size={40} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">整合資料匯入</h3>
          <p className="text-slate-500 text-sm font-bold leading-relaxed mb-10">
            上傳備份 JSON。系統會透過 <span className="text-amber-600">UUID 比對</span>，將上傳的舊紀錄精準掛載至對應的計畫項目，並自動建立關聯映射。
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".json"
          />
          <button 
            onClick={handleImportClick}
            disabled={isImporting}
            className="w-full py-5 bg-amber-500 text-white rounded-[24px] font-black flex items-center justify-center gap-3 hover:bg-amber-600 transition-all shadow-xl shadow-amber-100 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="animate-spin" /> : <ArrowRightLeft size={24} />}
            {isImporting ? '解析對接中...' : '上傳並自動對接資料'}
          </button>
        </div>
      </div>

      {importStatus.type !== 'none' && (
        <div className={`p-8 rounded-[32px] border-2 flex items-start gap-5 animate-in slide-in-from-top-4 duration-500 ${
          importStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          <div className={`p-2 rounded-full ${importStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
            {importStatus.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div>
            <p className="text-xl font-black">{importStatus.type === 'success' ? '資料連動成功' : '連動失敗'}</p>
            <p className="text-sm font-bold opacity-80 mt-1">{importStatus.message}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-50/80 rounded-[40px] p-10 border border-slate-100 mt-12">
        <h4 className="font-black text-slate-800 text-xl mb-6 flex items-center gap-3">
           <Database size={24} className="text-blue-600" />
           自動判別對接技術規格
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="space-y-2">
              <p className="font-black text-slate-800">UUID 映射技術</p>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">確保附件、報表精準掛載至唯一計畫 ID，即使計畫更名也能正確對接。</p>
           </div>
           <div className="space-y-2">
              <p className="font-black text-slate-800">Base64 解析</p>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">支援單據照片、訪視照片以二進位流匯入，匯入後即可立即預覽影像。</p>
           </div>
           <div className="space-y-2">
              <p className="font-black text-slate-800">MetaData 軌跡</p>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">完整保留部內審核狀態與人員修改時間戳記，確保考評歷史不中斷。</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DataMigration;
