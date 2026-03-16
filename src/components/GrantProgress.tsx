
import React, { useState, useRef } from 'react';
import { Project, GrantStage, GrantDocument, GrantDocStatus, UserRole, MOCCheckStatus } from '../types';
import { Calendar, ChevronDown, CheckCircle2, AlertCircle, FileText, Info, ShieldCheck, Clock, CheckCircle, MessageSquare, Upload, X, File } from 'lucide-react';
import { pb } from '../pocketbase';

interface GrantProgressProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  currentUserRole: string;
}

// 各期檢核文件清單（根據客戶需求）
const STAGE_DOCUMENTS: { [key: number]: { name: string; status: GrantDocStatus; checked: boolean; remark?: string; fileName?: string }[] } = {
  0: [ // 第一期
    { name: '公文', status: '—' as GrantDocStatus, checked: false },
    { name: '補助契約書（一式四份，需用印）', status: '—' as GrantDocStatus, checked: false },
    { name: '切結書', status: '—' as GrantDocStatus, checked: false },
    { name: '第一期款收據', status: '—' as GrantDocStatus, checked: false }
  ],
  1: [ // 第二期
    { name: '公文', status: '—' as GrantDocStatus, checked: false },
    { name: '修正對照表', status: '—' as GrantDocStatus, checked: false },
    { name: '修正計畫書', status: '—' as GrantDocStatus, checked: false },
    { name: '自行檢核表', status: '—' as GrantDocStatus, checked: false },
    { name: '第二期款收據', status: '—' as GrantDocStatus, checked: false }
  ],
  2: [ // 第三期
    { name: '公文', status: '—' as GrantDocStatus, checked: false },
    { name: '期中成果報告書', status: '—' as GrantDocStatus, checked: false },
    { name: '第一期與第二期款經費明細表', status: '—' as GrantDocStatus, checked: false },
    { name: '第三期款收據', status: '—' as GrantDocStatus, checked: false }
  ],
  3: [ // 第四期
    { name: '公文', status: '—' as GrantDocStatus, checked: false },
    { name: '全案期末成果報告書', status: '—' as GrantDocStatus, checked: false },
    { name: '全案執行經費明細表', status: '—' as GrantDocStatus, checked: false },
    { name: '第三期與第四期款經費明細表', status: '—' as GrantDocStatus, checked: false },
    { name: '第四期款收據', status: '—' as GrantDocStatus, checked: false }
  ]
};

// 文件狀態選項（根據客戶需求）
const DOC_STATUS_OPTIONS: GrantDocStatus[] = ['—', '未上傳', '已收到', '已退回', '已完成'];

// 文化部收訖狀態選項
const MOC_STATUS_OPTIONS = ['未收到', '已收到', '待補件', '已退回', '已完成'];

const GrantProgress: React.FC<GrantProgressProps> = ({ projects, onUpdateProject, currentUserRole }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [expandedRemarkDoc, setExpandedRemarkDoc] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const isAdmin = currentUserRole === UserRole.ADMIN;

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  // 確保 grants 至少有 4 期，並使用正確的文件清單
  const getDefaultGrants = (): GrantStage[] => {
    return [0, 1, 2, 3].map(idx => ({
      stage: `第 ${idx + 1} 期撥款`,
      documents: STAGE_DOCUMENTS[idx].map(doc => ({ ...doc })),
      submissionDate: '',
      deadline: '',
      documentSentDate: '',
      paymentReceivedDate: '',
      mocFinalCheck: '—' as MOCCheckStatus,
      mocRemark: ''
    }));
  };

  const currentGrants = (selectedProject?.grants && selectedProject.grants.length > 0) 
    ? selectedProject.grants.map((grant, idx) => {
        // 取得標準文件清單
        const standardDocs = STAGE_DOCUMENTS[idx] || [];
        const existingDocs = grant.documents || [];
        // 以標準文件清單為基準，保留已有文件的狀態
        const mergedDocs = standardDocs.map(sd => {
          const existing = existingDocs.find(d => d.name === sd.name);
          if (existing) {
            return { ...existing, checked: existing.checked ?? false, fileName: existing.fileName ?? '' };
          }
          return { ...sd };
        });
        return {
          ...grant,
          documents: mergedDocs
        };
      })
    : getDefaultGrants();

  const handleUpdateGrant = (stageIdx: number, field: keyof GrantStage, value: any) => {
    if (!selectedProject) return;
    const nextGrants = JSON.parse(JSON.stringify(currentGrants));
    if (!nextGrants[stageIdx]) {
      nextGrants[stageIdx] = { 
        stage: `第 ${stageIdx + 1} 期撥款`, 
        documents: STAGE_DOCUMENTS[stageIdx]?.map(doc => ({ ...doc })) || [],
        mocFinalCheck: '—' 
      };
    }
    nextGrants[stageIdx][field] = value;
    onUpdateProject({ ...selectedProject, grants: nextGrants });
  };

  const handleUpdateDocStatus = (stageIdx: number, docIdx: number, value: GrantDocStatus) => {
    if (!selectedProject) return;
    const nextGrants = JSON.parse(JSON.stringify(currentGrants));
    nextGrants[stageIdx].documents[docIdx].status = value;
    onUpdateProject({ ...selectedProject, grants: nextGrants });
  };

  const handleUpdateDocRemark = (stageIdx: number, docIdx: number, value: string) => {
    if (!selectedProject) return;
    const nextGrants = JSON.parse(JSON.stringify(currentGrants));
    nextGrants[stageIdx].documents[docIdx].remark = value;
    onUpdateProject({ ...selectedProject, grants: nextGrants });
  };

  // 處理 checkbox 勾選
  const handleToggleDocChecked = (stageIdx: number, docIdx: number) => {
    if (!selectedProject) return;
    const nextGrants = JSON.parse(JSON.stringify(currentGrants));
    nextGrants[stageIdx].documents[docIdx].checked = !nextGrants[stageIdx].documents[docIdx].checked;
    onUpdateProject({ ...selectedProject, grants: nextGrants });
  };

  // 處理檔案上傳（串接 PocketBase grant_files 欄位，並更新 MOCCheckStatus 為 pending）
  const handleFileUpload = async (stageIdx: number, docIdx: number, file: File | null) => {
    if (!selectedProject || !file) return;

    try {
      const formData = new FormData();
      // PocketBase 檔案欄位：grant_files（可以是單檔或多檔，依後端設定）
      formData.append('grant_files', file);
      // 同時更新後端計畫狀態欄位 MOCCheckStatus 為 pending
      formData.append('MOCCheckStatus', 'pending');

      // 這裡假設 Project.id 對應到 PocketBase projects collection 的 record id
      await pb.collection('projects').update(selectedProject.id, formData);

      // 後端成功後，再更新前端 state
      const nextGrants = JSON.parse(JSON.stringify(currentGrants));
      nextGrants[stageIdx].documents[docIdx].fileName = file.name;
      nextGrants[stageIdx].documents[docIdx].status = '已收到';
      nextGrants[stageIdx].documents[docIdx].checked = true;
      onUpdateProject({ ...selectedProject, grants: nextGrants });
    } catch (error) {
      console.error('上傳補助檔案失敗：', error);
      // 簡單錯誤提示（可以再依需求改成 toast 等更好的 UI）
      alert('檔案上傳失敗，請稍後再試。');
    }
  };

  // 清除已上傳檔案
  const handleClearFile = (stageIdx: number, docIdx: number) => {
    if (!selectedProject) return;
    const nextGrants = JSON.parse(JSON.stringify(currentGrants));
    nextGrants[stageIdx].documents[docIdx].fileName = '';
    nextGrants[stageIdx].documents[docIdx].status = '未上傳';
    nextGrants[stageIdx].documents[docIdx].checked = false;
    onUpdateProject({ ...selectedProject, grants: nextGrants });
  };

  // 獲取狀態顏色
  const getStatusColor = (status: GrantDocStatus) => {
    switch (status) {
      case '已完成': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '已收到': return 'bg-blue-100 text-blue-700 border-blue-200';
      case '已退回': return 'bg-red-100 text-red-700 border-red-200';
      case '待補件': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '未上傳': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-white text-slate-400 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">補助款撥付進度</h2>
          <p className="text-slate-400 font-bold text-sm">追蹤各期款項文件檢核與撥付狀態。</p>
        </div>
        <div className="relative w-full max-w-xs">
           <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-black text-slate-700 outline-none shadow-sm appearance-none"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* 撥付進度總覽表格 */}
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <h3 className="text-xl font-black text-white">補助款撥付進度</h3>
          <p className="text-blue-200 text-sm font-bold mt-1">各期款項撥付狀態追蹤</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-amber-50 border-b border-amber-100">
                <th className="px-6 py-4 text-left font-black text-slate-700">撥款期數</th>
                <th className="px-6 py-4 text-center font-black text-slate-700">截止日期</th>
                <th className="px-6 py-4 text-left font-black text-slate-700">檢核文件確認</th>
                <th className="px-6 py-4 text-center font-black text-slate-700">公文寄出日期</th>
                <th className="px-6 py-4 text-center font-black text-slate-700">入帳日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentGrants.map((grant, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-700">第{idx + 1}期</td>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="date" 
                      className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm font-bold text-amber-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                      value={grant.deadline || ''}
                      onChange={(e) => handleUpdateGrant(idx, 'deadline', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {grant.documents.map((doc, dIdx) => (
                        <label key={dIdx} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={doc.checked || false}
                            onChange={() => handleToggleDocChecked(idx, dIdx)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`text-sm ${doc.checked ? 'text-slate-700 font-bold' : 'text-slate-500'}`}>
                            {doc.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="date" 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={grant.documentSentDate || ''}
                      onChange={(e) => handleUpdateGrant(idx, 'documentSentDate', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="date" 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={grant.paymentReceivedDate || ''}
                      onChange={(e) => handleUpdateGrant(idx, 'paymentReceivedDate', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 各期詳細文件檢核 */}
      <div className="space-y-8">
        {currentGrants.map((grant, sIdx) => (
          <div key={sIdx} className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
            {/* 卡片標題區 */}
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-200">
                    {sIdx + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">{grant.stage}</h3>
                    <p className="text-slate-400 text-sm font-bold mt-1">
                      {grant.documents.filter(d => d.checked).length} / {grant.documents.length} 項文件已確認
                    </p>
                  </div>
               </div>
               <div className={`px-6 py-3 rounded-2xl text-sm font-black ${
                 grant.mocFinalCheck === '符合' ? 'bg-emerald-100 text-emerald-700' : 
                 grant.mocFinalCheck === '不符合' ? 'bg-red-100 text-red-700' : 
                 'bg-slate-100 text-slate-500'
               }`}>
                 {grant.mocFinalCheck === '—' ? '待檢核' : grant.mocFinalCheck}
               </div>
            </div>

            {/* 文件檢核清單 */}
            <div className="p-8 space-y-6">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <CheckCircle2 size={16} />
                 </div>
                 <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">檢核文件確認</span>
               </div>
               
               <div className="space-y-3">
                  {grant.documents.map((doc, dIdx) => {
                    const docKey = `${sIdx}-${dIdx}`;
                    const needsRemark = doc.status === '已退回' || doc.status === '待補件';
                    
                    return (
                      <div key={dIdx} className="space-y-2">
                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                 {/* Checkbox */}
                                 <label className="relative flex items-center cursor-pointer">
                                   <input 
                                     type="checkbox" 
                                     checked={doc.checked || false}
                                     onChange={() => handleToggleDocChecked(sIdx, dIdx)}
                                     className="sr-only peer"
                                   />
                                   <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                     doc.checked 
                                       ? 'bg-blue-600 border-blue-600' 
                                       : 'bg-white border-slate-300 hover:border-blue-400'
                                   }`}>
                                     {doc.checked && <CheckCircle size={16} className="text-white" />}
                                   </div>
                                 </label>
                                 <div className="p-2.5 bg-white rounded-xl shadow-sm">
                                   <FileText size={18} className="text-blue-500" />
                                 </div>
                                 <span className={`font-bold ${doc.checked ? 'text-slate-800' : 'text-slate-500'}`}>
                                   {doc.name}
                                 </span>
                              </div>
                              
                              <div className="flex items-center gap-3 flex-wrap">
                                {/* 檔案上傳 */}
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="file"
                                    ref={(el) => fileInputRefs.current[docKey] = el}
                                    onChange={(e) => handleFileUpload(sIdx, dIdx, e.target.files?.[0] || null)}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                  />
                                  {doc.fileName ? (
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-sm font-bold">
                                      <File size={14} />
                                      <span className="max-w-[120px] truncate">{doc.fileName}</span>
                                      <button 
                                        onClick={() => handleClearFile(sIdx, dIdx)}
                                        className="p-1 hover:bg-emerald-100 rounded-full"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => fileInputRefs.current[docKey]?.click()}
                                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                                    >
                                      <Upload size={14} />
                                      上傳檔案
                                    </button>
                                  )}
                                </div>
                                
                                {/* 狀態顯示/選擇 */}
                                {isAdmin ? (
                                  <select 
                                   className={`border rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all cursor-pointer ${getStatusColor(doc.status)}`}
                                   value={doc.status}
                                   onChange={(e) => handleUpdateDocStatus(sIdx, dIdx, e.target.value as GrantDocStatus)}
                                  >
                                    {DOC_STATUS_OPTIONS.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`border rounded-xl px-4 py-2.5 text-sm font-black ${getStatusColor(doc.status)}`}>
                                    {doc.status}
                                  </span>
                                )}
                                
                                {needsRemark && (
                                  <button
                                    onClick={() => setExpandedRemarkDoc(expandedRemarkDoc === docKey ? null : docKey)}
                                    className={`p-2.5 rounded-xl transition-all ${
                                      expandedRemarkDoc === docKey ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400 hover:text-amber-500'
                                    }`}
                                    title="填寫備註說明"
                                  >
                                    <MessageSquare size={18} />
                                  </button>
                                )}
                              </div>
                           </div>
                        </div>
                        
                        {/* 備註輸入區（已退回或待補件時顯示） */}
                        {needsRemark && expandedRemarkDoc === docKey && (
                          <div className="ml-14 animate-in slide-in-from-top-2 duration-200">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                              <label className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2 block">
                                {doc.status === '已退回' ? '退回原因說明' : '需補件項目說明'}
                              </label>
                              <textarea 
                                className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[80px]"
                                placeholder={doc.status === '已退回' ? '請說明退回原因...' : '請說明需要補什麼文件...'}
                                value={doc.remark || ''}
                                onChange={(e) => handleUpdateDocRemark(sIdx, dIdx, e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* 顯示已有的備註 */}
                        {doc.remark && !needsRemark && (
                          <div className="ml-14 text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border-l-4 border-slate-300">
                            <span className="font-bold text-slate-600">備註：</span> {doc.remark}
                          </div>
                        )}
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* 文化部收訖狀態 */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-8 border-t border-slate-200/50">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-100">
                        <ShieldCheck size={28} className="text-emerald-500" />
                     </div>
                     <div>
                        <h4 className="font-black text-slate-800 text-lg">文化部收訖</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-0.5">MOC Document Receipt Status</p>
                     </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-96">
                     <select 
                      className={`w-full px-5 py-3.5 rounded-xl text-sm font-black border outline-none shadow-lg transition-all ${
                        grant.mocFinalCheck === '符合' || grant.mocFinalCheck === '已完成' as any ? 'bg-emerald-600 text-white border-emerald-700' : 
                        grant.mocFinalCheck === '不符合' || grant.mocFinalCheck === '已退回' as any ? 'bg-red-600 text-white border-red-700' : 
                        grant.mocFinalCheck === '待補件' as any ? 'bg-amber-500 text-white border-amber-600' :
                        'bg-white text-slate-700 border-slate-200'
                      }`}
                      value={grant.mocFinalCheck}
                      onChange={(e) => handleUpdateGrant(sIdx, 'mocFinalCheck', e.target.value as MOCCheckStatus)}
                      disabled={!isAdmin}
                     >
                       <option value="—">未收到</option>
                       <option value="已收到">已收到</option>
                       <option value="待補件">待補件</option>
                       <option value="不符合">已退回</option>
                       <option value="符合">已完成</option>
                     </select>
                     
                     {(grant.mocFinalCheck === '不符合' || grant.mocFinalCheck === '待補件' as any) && (
                       <textarea 
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 min-h-[70px]"
                          placeholder="請說明退回原因或需補件項目..."
                          value={grant.mocRemark || ''}
                          onChange={(e) => handleUpdateGrant(sIdx, 'mocRemark', e.target.value)}
                          disabled={!isAdmin}
                       />
                     )}
                     
                     {grant.mocRemark && grant.mocFinalCheck !== '不符合' && grant.mocFinalCheck !== ('待補件' as any) && (
                       <div className="text-xs text-slate-500 bg-white rounded-lg p-3 border border-slate-200">
                         <span className="font-bold">備註：</span> {grant.mocRemark}
                       </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GrantProgress;
