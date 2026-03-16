import React, { useState, useRef } from 'react';
import { Project, CoachingRecord, CoachingFinalReport as FinalReportType, UserRole } from '../types';
import { FileText, Calendar, Camera, Save, Download, X, Plus, Printer } from 'lucide-react';

interface CoachingFinalReportProps {
  projects: Project[];
  coachingRecords: CoachingRecord[];
  currentUserRole: UserRole;
  onSaveReport?: (report: FinalReportType) => void;
}

const CoachingFinalReport: React.FC<CoachingFinalReportProps> = ({ 
  projects, 
  coachingRecords, 
  currentUserRole,
  onSaveReport 
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [showModal, setShowModal] = useState(false);
  const [comprehensiveOpinion, setComprehensiveOpinion] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const isCoach = currentUserRole === UserRole.COACH;
  const isAdmin = currentUserRole === UserRole.ADMIN;
  // 只有輔導老師可以編輯結案報告，管理員只能閱覽和匯出
  const canEdit = isCoach;
  const canView = isCoach || isAdmin;
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  // 取得該計畫的所有輔導紀錄
  const projectRecords = coachingRecords.filter(r => r.projectId === selectedProjectId);
  
  // 整合訪視摘要列表（訪視日期 + 整體訪視重點）
  const visitSummaries = projectRecords.map(record => ({
    date: record.date,
    keyPoints: record.keyPoints || ''
  }));
  
  // 整合所有訪視照片
  const allPhotos = projectRecords.flatMap(record => record.photos || []);

  const handleGenerateReport = () => {
    setShowModal(true);
  };

  const handleExportReport = () => {
    // 使用瀏覽器列印功能匯出 PDF
    const printContent = reportRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>輔導結案報告 - ${selectedProject?.name}</title>
            <style>
              body { font-family: 'Microsoft JhengHei', sans-serif; padding: 40px; }
              h1 { text-align: center; font-size: 24px; margin-bottom: 30px; }
              h2 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #333; padding: 12px; text-align: left; }
              th { background: #f0f0f0; font-weight: bold; }
              .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
              .photo-grid img { width: 100%; height: 200px; object-fit: cover; border: 1px solid #ccc; }
              .opinion-box { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin: 20px 0; min-height: 100px; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            <h1>輔導結案報告</h1>
            <table>
              <tr><th>計畫名稱</th><td>${selectedProject?.name || ''}</td></tr>
              <tr><th>執行單位</th><td>${selectedProject?.executingUnit || ''}</td></tr>
              <tr><th>輔導次數</th><td>${projectRecords.length} 次</td></tr>
            </table>
            
            <h2>訪視紀錄摘要</h2>
            <table>
              <thead>
                <tr><th style="width:120px">訪視日期</th><th>整體訪視重點</th></tr>
              </thead>
              <tbody>
                ${visitSummaries.map(v => `<tr><td>${v.date}</td><td>${v.keyPoints || '無'}</td></tr>`).join('')}
              </tbody>
            </table>
            
            <h2>綜合輔導意見</h2>
            <div class="opinion-box">${comprehensiveOpinion || '無'}</div>
            
            <h2>訪視照片彙整</h2>
            <div class="photo-grid">
              ${allPhotos.map(photo => `<img src="${photo}" alt="訪視照片" />`).join('')}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleSaveReport = () => {
    if (onSaveReport) {
      const report: FinalReportType = {
        id: `fr-${Date.now()}`,
        projectId: selectedProjectId,
        coachId: 'coach-1', // 實際應從 currentUser 取得
        visitSummaries,
        comprehensiveOpinion,
        allPhotos,
        createdAt: new Date().toISOString()
      };
      onSaveReport(report);
    }
    setShowModal(false);
  };

  if (!canView) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 px-4">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl">
                <FileText size={28} />
              </div>
              輔導結案報告
            </h2>
            {isAdmin && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                唯讀模式 - 僅可查看和匯出
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 font-black text-slate-800 outline-none shadow-sm"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {canEdit && (
              <button 
                onClick={handleGenerateReport}
                className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <Plus size={20} /> 產生結案報告
              </button>
            )}
          </div>
        </div>

        {/* 計畫資訊摘要 */}
        <div className="bg-slate-50 rounded-3xl p-6 mb-6">
          <h3 className="font-black text-slate-700 mb-4">計畫資訊</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400 font-bold">計畫名稱</span>
              <p className="font-black text-slate-800">{selectedProject?.name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold">執行單位</span>
              <p className="font-black text-slate-800">{selectedProject?.executingUnit}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold">輔導次數</span>
              <p className="font-black text-emerald-600">{projectRecords.length} 次</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold">照片數量</span>
              <p className="font-black text-blue-600">{allPhotos.length} 張</p>
            </div>
          </div>
        </div>

        {/* 訪視紀錄列表 */}
        <div className="space-y-4">
          <h3 className="font-black text-slate-700">訪視紀錄摘要</h3>
          {projectRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold">尚無訪視紀錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projectRecords.map((record, idx) => (
                <div key={record.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black">
                        第 {idx + 1} 次訪視
                      </span>
                      <span className="text-sm font-bold text-slate-600">{record.date}</span>
                    </div>
                    <span className="text-xs text-slate-400">{record.photos?.length || 0} 張照片</span>
                  </div>
                  {record.keyPoints && (
                    <p className="mt-3 text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl">
                      {record.keyPoints}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 結案報告預覽 Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">輔導結案報告預覽</h3>
              <div className="flex gap-3">
                <button 
                  onClick={handleExportReport}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer size={18} /> 列印/匯出
                </button>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div ref={reportRef} className="flex-1 overflow-y-auto p-10 bg-white">
              {/* 報告標題 */}
              <h1 className="text-2xl font-black text-center text-slate-800 mb-8">輔導結案報告</h1>
              
              {/* 計畫基本資訊 */}
              <div className="border-2 border-slate-300 mb-6">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="bg-slate-100 p-4 border border-slate-300 font-black w-1/4">計畫名稱</td>
                      <td className="p-4 border border-slate-300 font-bold">{selectedProject?.name}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 p-4 border border-slate-300 font-black">執行單位</td>
                      <td className="p-4 border border-slate-300 font-bold">{selectedProject?.executingUnit}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 p-4 border border-slate-300 font-black">輔導次數</td>
                      <td className="p-4 border border-slate-300 font-bold">{projectRecords.length} 次</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 訪視紀錄摘要列表 */}
              <h2 className="text-lg font-black text-slate-700 border-b-2 border-slate-300 pb-2 mb-4">訪視紀錄摘要</h2>
              <div className="border-2 border-slate-300 mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-4 border border-slate-300 font-black w-32">訪視日期</th>
                      <th className="p-4 border border-slate-300 font-black">整體訪視重點</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitSummaries.map((summary, idx) => (
                      <tr key={idx}>
                        <td className="p-4 border border-slate-300 font-bold text-center">{summary.date}</td>
                        <td className="p-4 border border-slate-300 font-medium">{summary.keyPoints || '無'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 綜合輔導意見 */}
              <h2 className="text-lg font-black text-slate-700 border-b-2 border-slate-300 pb-2 mb-4">綜合輔導意見</h2>
              <div className="border-2 border-slate-300 p-4 mb-6 min-h-[150px]">
                {canEdit ? (
                  <textarea
                    className="w-full min-h-[120px] outline-none font-medium text-slate-800 resize-none"
                    placeholder="請輸入綜合輔導意見..."
                    value={comprehensiveOpinion}
                    onChange={e => setComprehensiveOpinion(e.target.value)}
                  />
                ) : (
                  <div className="w-full min-h-[120px] font-medium text-slate-800">
                    {comprehensiveOpinion || <span className="text-slate-400">尚未填寫綜合輔導意見</span>}
                  </div>
                )}
              </div>

              {/* 訪視照片彙整 */}
              <h2 className="text-lg font-black text-slate-700 border-b-2 border-slate-300 pb-2 mb-4">訪視照片彙整</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {allPhotos.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-slate-400">
                    <Camera size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold">尚無訪視照片</p>
                  </div>
                ) : (
                  allPhotos.map((photo, idx) => (
                    <div key={idx} className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                      <img src={photo} alt={`訪視照片 ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex gap-4 justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                {canEdit ? '取消' : '關閉'}
              </button>
              {canEdit && (
                <button 
                  onClick={handleSaveReport}
                  className="px-12 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-3"
                >
                  <Save size={20} /> 儲存結案報告
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachingFinalReport;
