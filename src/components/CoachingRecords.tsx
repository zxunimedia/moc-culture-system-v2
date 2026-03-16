
import React, { useState, useRef } from 'react';
import { Project, CoachingRecord, UserRole, KRStatus, VisitRow, AssessmentResult } from '../types';
import { Plus, X, Calendar, Camera, Trash2, MessageSquare, Save, Pencil, Upload, FileCheck, Info, ChevronRight, AlertTriangle, Download } from 'lucide-react';
import { exportCoachingRecords } from '../utils/exportUtils';

interface CoachingRecordsProps {
  projects: Project[];
  coachingRecords: CoachingRecord[];
  onSaveRecord: (record: CoachingRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  currentUserRole: UserRole;
  currentUserUnitId?: string;
}

const CoachingRecords: React.FC<CoachingRecordsProps> = ({ projects, coachingRecords, onSaveRecord, onDeleteRecord, currentUserRole, currentUserUnitId }) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const visibleProjects = projects;
  const [selectedProjectId, setSelectedProjectId] = useState(visibleProjects[0]?.id || '');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<CoachingRecord> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAdmin = currentUserRole === UserRole.ADMIN;
  const isCoach = currentUserRole === UserRole.COACH;
  const isOperator = currentUserRole === UserRole.OPERATOR;
  const selectedProject = visibleProjects.find(p => p.id === selectedProjectId);
  const filteredRecords = coachingRecords.filter(r => r.projectId === selectedProjectId);

  const initAssessment = (): AssessmentResult => ({ status: KRStatus.ON_TRACK, strategy: '' });
  const initVisitRow = (id: string, workItem: string = ''): VisitRow => ({ id, workItem, opinion: '', status: KRStatus.ON_TRACK, strategy: '' });

  // 判斷紀錄類型
  const getRecordType = (record: CoachingRecord | Partial<CoachingRecord>): 'coach' | 'team' => {
    if (record.recordType) return record.recordType;
    // 向下相容：根據 writer 判斷
    if (!record.writer) return 'team';
    const writerLower = record.writer.toLowerCase();
    if (writerLower.includes('輔導') || writerLower.includes('coach') || writerLower.includes('coach@')) return 'coach';
    return 'team';
  };

  const isCoachRecord = (record: CoachingRecord | Partial<CoachingRecord>) => getRecordType(record) === 'coach';
  const isTeamRecord = (record: CoachingRecord | Partial<CoachingRecord>) => getRecordType(record) === 'team';

  const handleOpenNew = () => {
    if (!isAdmin && !isCoach) return;
    const projectCode = selectedProject?.projectCode || selectedProjectId;
    const serial = `${projectCode}-${(filteredRecords.length + 1).toString().padStart(3, '0')}`;
    
    const keyResults: VisitRow[] = [];
    if (selectedProject?.visions) {
      selectedProject.visions.forEach(vision => {
        vision.objectives.forEach(obj => {
          obj.keyResults.forEach(kr => {
            keyResults.push(initVisitRow(kr.id, kr.description));
          });
        });
      });
    }
    const visitContents = keyResults.length > 0 ? keyResults : [initVisitRow('1'), initVisitRow('2')];
    
    // 根據角色決定紀錄類型
    const recordType: 'coach' | 'team' = isCoach ? 'coach' : 'team';

    // 自動帶入資料
    const location = selectedProject?.siteTypes && selectedProject?.sites 
      ? `${selectedProject.siteTypes.join('/')}: ${selectedProject.sites.join('、')}`
      : '';
    
    const period = selectedProject?.startDate && selectedProject?.endDate
      ? `${selectedProject.startDate} 至 ${selectedProject.endDate}`
      : '';

    let okrSummary = '';
    if (selectedProject?.visions) {
      okrSummary = selectedProject.visions.map(v => {
        const objectives = v.objectives.map(o => {
          const krs = o.keyResults.map(k => `  - ${k.description} (目標: ${k.targetValue})`).join('\n');
          return `* ${o.title}\n${krs}`;
        }).join('\n');
        return `【願景: ${v.title}】\n${objectives}`;
      }).join('\n\n');
    }

    const coachName = isCoach ? '輔導老師' : ''; // 這裡理想上應從當前使用者名稱帶入，目前先預設文字
    
    setEditingRecord({
      id: `cr-${Date.now()}`,
      projectId: selectedProjectId,
      serialNumber: serial,
      location: location,
      frequency: (filteredRecords.length + 1).toString(),
      method: '實地訪視',
      writer: isCoach ? '輔導老師' : '管理員',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '12:00',
      recordType,
      attendees: { commissioners: false, staff: false, representatives: false, liaison: false, others: '' },
      // 輔導老師版專用欄位
      coachAttendees: { coach: coachName, unitStaff: '', otherStaff: '' },
      planSummary: { period: period, okrSummary: okrSummary, reviewMechanism: '' },
      progressStatus: '符合',
      coachObservation: { executionStatus: '', teamSuggestion: '', mocSuggestion: '' },
      overallResults: { progress: initAssessment(), content: initAssessment(), records: initAssessment(), vouchers: initAssessment() },
      visitContents: visitContents,
      communityMobilization: initVisitRow('cm', '全計畫捲動在地社區/部落參與人數'),
      communityConnection: initVisitRow('cc', '全計畫串連社群個數'),
      photos: [],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (record: CoachingRecord) => {
    setEditingRecord({...record});
    setShowModal(true);
  };

  const canEditRecord = (record: CoachingRecord | Partial<CoachingRecord>) => {
    if (isOperator) return false;
    if (!record.writer) return true;
    if (isCoach && isCoachRecord(record)) return true;
    if (isAdmin && isTeamRecord(record)) return true;
    return false;
  };

  const updateVisitContent = (id: string, field: keyof VisitRow, value: any) => {
    if (!editingRecord) return;
    const next = editingRecord.visitContents?.map(row => row.id === id ? { ...row, [field]: value } : row);
    setEditingRecord({ ...editingRecord, visitContents: next });
  };

  const handleSave = () => {
    if (editingRecord) {
      onSaveRecord(editingRecord as CoachingRecord);
      setShowModal(false);
    }
  };

  // ============ 輔導老師版 Modal ============
  const renderCoachModal = (canEditForm: boolean) => (
    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden max-w-4xl mx-auto">
      <table className="w-full border-collapse border-slate-300 text-sm font-bold">
        <tbody>
          {/* 表格標題 */}
          <tr>
            <td colSpan={4} className="text-center py-4 bg-white border-b-2 border-slate-300">
              <div className="text-lg font-black text-slate-700">文化部「原住民村落文化發展計畫」</div>
              <div className="text-2xl font-black tracking-[0.2em] text-slate-700 mt-1">輔導老師訪視紀錄表</div>
            </td>
          </tr>
          {/* 訪視時間 & 訪視地點 */}
          <tr>
            <td className="record-header w-28">訪視時間</td>
            <td className="record-cell">
              <input type="date" className="record-input" value={editingRecord?.date} onChange={e => canEditForm && setEditingRecord({...editingRecord!, date: e.target.value})} disabled={!canEditForm} />
              <div className="mt-1">
                <input type="time" className="inline-input" value={editingRecord?.startTime} onChange={e => canEditForm && setEditingRecord({...editingRecord!, startTime: e.target.value})} disabled={!canEditForm} />
                {' 至 '}
                <input type="time" className="inline-input" value={editingRecord?.endTime} onChange={e => canEditForm && setEditingRecord({...editingRecord!, endTime: e.target.value})} disabled={!canEditForm} />
              </div>
            </td>
            <td className="record-header w-28">訪視地點</td>
            <td className="record-cell">
              <input type="text" className="record-input" value={editingRecord?.location} onChange={e => canEditForm && setEditingRecord({...editingRecord!, location: e.target.value})} placeholder="請填寫地點..." disabled={!canEditForm} />
            </td>
          </tr>
          {/* 受訪單位 & 計畫名稱 */}
          <tr>
            <td className="record-header">受訪單位</td>
            <td className="record-cell">{selectedProject?.executingUnit}</td>
            <td className="record-header">計畫名稱</td>
            <td className="record-cell">{selectedProject?.name}</td>
          </tr>
          {/* 計畫執行地點 */}
          <tr>
            <td className="record-header">計畫執行地點</td>
            <td colSpan={3} className="record-cell">
              <input type="text" className="record-input" value={editingRecord?.location || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, location: e.target.value})} placeholder="請填寫計畫執行地點..." disabled={!canEditForm} />
            </td>
          </tr>
          {/* 參與人員 */}
          <tr>
            <td className="record-header">參與人員</td>
            <td colSpan={3} className="record-cell space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-600 w-28 shrink-0">輔導老師：</span>
                <input type="text" className="record-input flex-1 border-b border-slate-300" value={editingRecord?.coachAttendees?.coach || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, coachAttendees: {...editingRecord!.coachAttendees!, coach: e.target.value}})} placeholder="請填寫輔導老師姓名" disabled={!canEditForm} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-600 w-28 shrink-0">受訪單位人員：</span>
                <input type="text" className="record-input flex-1 border-b border-slate-300" value={editingRecord?.coachAttendees?.unitStaff || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, coachAttendees: {...editingRecord!.coachAttendees!, unitStaff: e.target.value}})} placeholder="請填寫受訪單位人員" disabled={!canEditForm} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-600 w-28 shrink-0">其他單位人員：</span>
                <input type="text" className="record-input flex-1 border-b border-slate-300" value={editingRecord?.coachAttendees?.otherStaff || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, coachAttendees: {...editingRecord!.coachAttendees!, otherStaff: e.target.value}})} placeholder="請填寫其他單位人員" disabled={!canEditForm} />
              </div>
            </td>
          </tr>
          {/* 計畫摘要（本部窗口協助填寫） */}
          <tr>
            <td className="record-header">計畫摘要<br/><span className="text-[10px] text-slate-400 font-normal">(本部窗口協助填寫)</span></td>
            <td colSpan={3} className="record-cell p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-black text-slate-600 w-32 border-r border-slate-200">一、計畫期程</td>
                    <td className="p-3">
                      <input type="text" className="record-input" value={editingRecord?.planSummary?.period || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, planSummary: {...editingRecord!.planSummary!, period: e.target.value}})} placeholder="請填寫計畫期程..." disabled={!canEditForm} />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-black text-slate-600 border-r border-slate-200">二、計畫OKR簡表</td>
                    <td className="p-3">
                      <textarea className="record-input min-h-[80px]" value={editingRecord?.planSummary?.okrSummary || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, planSummary: {...editingRecord!.planSummary!, okrSummary: e.target.value}})} placeholder="請填寫計畫OKR簡表..." disabled={!canEditForm} />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-black text-slate-600 border-r border-slate-200">三、定期檢討機制</td>
                    <td className="p-3">
                      <textarea className="record-input min-h-[60px]" value={editingRecord?.planSummary?.reviewMechanism || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, planSummary: {...editingRecord!.planSummary!, reviewMechanism: e.target.value}})} placeholder="請填寫定期檢討機制..." disabled={!canEditForm} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          {/* 輔導老師觀察紀錄及提供本部建議 */}
          <tr>
            <td className="record-header">輔導老師<br/>觀察紀錄<br/>及提供<br/>本部建議</td>
            <td colSpan={3} className="record-cell p-0">
              <table className="w-full border-collapse">
                <tbody>
                  {/* 進度達成情形 */}
                  <tr className="border-b border-slate-200">
                    <td colSpan={2} className="p-4">
                      <div className="font-black text-slate-700 mb-3">本案進度達成情形（請於訪視時勾選）：</div>
                      <div className="flex gap-6 flex-wrap">
                        {(['嚴重落後', '稍微落後', '符合', '超前進度'] as const).map(status => (
                          <label key={status} className={`flex items-center gap-2 ${!canEditForm ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                            <input type="radio" checked={editingRecord?.progressStatus === status} onChange={() => canEditForm && setEditingRecord({...editingRecord!, progressStatus: status})} disabled={!canEditForm} />
                            <span className={`font-bold ${status === '嚴重落後' ? 'text-red-600' : status === '稍微落後' ? 'text-amber-600' : status === '符合' ? 'text-green-600' : 'text-blue-600'}`}>{status}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {/* 一、計畫執行狀況說明 */}
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-black text-slate-600 w-32 border-r border-slate-200 align-top">一、計畫執行狀況說明</td>
                    <td className="p-3">
                      <textarea className="record-input min-h-[100px]" value={editingRecord?.coachObservation?.executionStatus || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, coachObservation: {...editingRecord!.coachObservation!, executionStatus: e.target.value}})} placeholder="請說明計畫執行狀況..." disabled={!canEditForm} />
                    </td>
                  </tr>
                  {/* 二、提供團隊建議 */}
                  <tr className="border-b border-slate-200">
                    <td className="p-3 bg-slate-50 font-black text-slate-600 border-r border-slate-200 align-top">二、提供團隊建議<br/><span className="text-[10px] text-slate-400 font-normal">(含適時引介相關資源)</span></td>
                    <td className="p-3">
                      <textarea className="record-input min-h-[100px]" value={editingRecord?.coachObservation?.teamSuggestion || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, coachObservation: {...editingRecord!.coachObservation!, teamSuggestion: e.target.value}})} placeholder="請提供團隊建議..." disabled={!canEditForm} />
                    </td>
                  </tr>
                  {/* 三、提供本部建議 */}
                  <tr>
                    <td className="p-3 bg-slate-50 font-black text-slate-600 border-r border-slate-200 align-top">三、提供本部建議</td>
                    <td className="p-3">
                      <textarea className="record-input min-h-[100px]" value={editingRecord?.coachObservation?.mocSuggestion || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, coachObservation: {...editingRecord!.coachObservation!, mocSuggestion: e.target.value}})} placeholder="請提供本部建議..." disabled={!canEditForm} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          {/* 現場照片 */}
          <tr>
            <td className="record-header">現場照片</td>
            <td colSpan={3} className="record-cell min-h-[200px]">
              <div className="flex flex-col items-center justify-center gap-4 py-6 text-slate-400">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full px-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-all">
                      {editingRecord?.photos?.[i] ? (
                        <>
                          <img src={editingRecord.photos[i]} className="w-full h-full object-cover" alt={`現場照片 ${i+1}`} />
                          {canEditForm && (
                            <button 
                              onClick={() => {
                                const newPhotos = [...(editingRecord.photos || [])];
                                newPhotos.splice(i, 1);
                                setEditingRecord({...editingRecord, photos: newPhotos});
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </>
                      ) : (
                        canEditForm ? (
                          <label className="cursor-pointer flex flex-col items-center gap-2 p-4">
                            <Camera size={28} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">照片 {i+1}</span>
                            <input 
                              type="file" accept="image/*" className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const newPhotos = [...(editingRecord?.photos || [])];
                                    newPhotos[i] = ev.target?.result as string;
                                    setEditingRecord({...editingRecord!, photos: newPhotos});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex flex-col items-center gap-2 p-4">
                            <Camera size={28} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">照片 {i+1}</span>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
                {canEditForm && (
                  <p className="text-xs font-black text-amber-600 flex items-center gap-2">
                    <AlertTriangle size={14} /> 至少上傳3張照片
                  </p>
                )}
              </div>
            </td>
          </tr>
          {/* 受輔導團隊意見回應 */}
          <tr>
            <td className="record-header" colSpan={1}>受輔導團隊<br/>意見回應</td>
            <td className="record-cell" colSpan={3}>
              <textarea 
                className="w-full min-h-[100px] bg-amber-50/50 border border-amber-200 rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                placeholder="請受輔導團隊填寫對此次輔導紀錄的意見回應..."
                value={editingRecord?.operatorFeedback || ''}
                onChange={e => isOperator && setEditingRecord({...editingRecord!, operatorFeedback: e.target.value})}
                disabled={!isOperator}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ============ 輔導團隊版 Modal（原有版本） ============
  const renderTeamModal = (canEditForm: boolean) => (
    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden max-w-4xl mx-auto">
      <table className="w-full border-collapse border-slate-300 text-sm font-bold">
        <tbody>
          {/* 表格標題 */}
          <tr>
            <td colSpan={6} className="text-center py-4 bg-white border-b-2 border-slate-300 text-2xl font-black tracking-[0.2em] text-slate-700">訪視輔導紀錄表</td>
          </tr>
          {/* 單位名稱 & 計畫名稱 */}
          <tr>
            <td className="record-header w-32">受輔導團隊</td>
            <td className="record-cell">{selectedProject?.executingUnit}</td>
            <td className="record-header w-32">計畫名稱</td>
            <td colSpan={3} className="record-cell">{selectedProject?.name}</td>
          </tr>
          {/* 輔導地點 & 輔導次數 */}
          <tr>
            <td className="record-header">輔導地點</td>
            <td className="record-cell">
              <input type="text" className="record-input" value={editingRecord?.location} onChange={e => canEditForm && setEditingRecord({...editingRecord!, location: e.target.value})} placeholder="請填寫地點..." disabled={!canEditForm} />
            </td>
            <td className="record-header">輔導次數</td>
            <td colSpan={3} className="record-cell">第 <input type="text" className="inline-input w-12" value={editingRecord?.frequency} onChange={e => canEditForm && setEditingRecord({...editingRecord!, frequency: e.target.value})} disabled={!canEditForm} /> 次</td>
          </tr>
          {/* 輔導方式 & 填寫人 */}
          <tr>
            <td className="record-header">輔導方式</td>
            <td className="record-cell">
              <div className="flex gap-4">
                {['實地訪視', '視訊', '電話', '其他'].map(m => (
                  <label key={m} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={editingRecord?.method === m} onChange={() => canEditForm && setEditingRecord({...editingRecord!, method: m as any})} disabled={!canEditForm} /> {m}
                  </label>
                ))}
              </div>
            </td>
            <td className="record-header">填寫人</td>
            <td colSpan={3} className="record-cell">
              <input type="text" className="record-input" value={editingRecord?.writer} onChange={e => canEditForm && setEditingRecord({...editingRecord!, writer: e.target.value})} disabled={!canEditForm} />
            </td>
          </tr>
          {/* 輔導日期 & 輔導時間 */}
          <tr>
            <td className="record-header">輔導日期</td>
            <td className="record-cell">
              <input type="date" className="record-input" value={editingRecord?.date} onChange={e => canEditForm && setEditingRecord({...editingRecord!, date: e.target.value})} disabled={!canEditForm} />
            </td>
            <td className="record-header">輔導時間</td>
            <td colSpan={3} className="record-cell">
              <input type="time" className="inline-input" value={editingRecord?.startTime} onChange={e => canEditForm && setEditingRecord({...editingRecord!, startTime: e.target.value})} disabled={!canEditForm} /> 
              {' 至 '}
              <input type="time" className="inline-input" value={editingRecord?.endTime} onChange={e => canEditForm && setEditingRecord({...editingRecord!, endTime: e.target.value})} disabled={!canEditForm} />
            </td>
          </tr>
          {/* 出席人員 */}
          <tr>
            <td className="record-header">出席人員</td>
            <td colSpan={5} className="record-cell space-y-2">
              <AttendeeRow label="輔導老師" name={selectedProject?.commissioner.name} checked={editingRecord?.attendees?.commissioners} onChange={() => canEditForm && setEditingRecord({...editingRecord!, attendees: {...editingRecord!.attendees!, commissioners: !editingRecord?.attendees?.commissioners}})} disabled={!canEditForm} />
              <AttendeeRow label="主責人員" name={selectedProject?.chiefStaff.name} checked={editingRecord?.attendees?.staff} onChange={() => canEditForm && setEditingRecord({...editingRecord!, attendees: {...editingRecord!.attendees!, staff: !editingRecord?.attendees?.staff}})} disabled={!canEditForm} />
              <AttendeeRow label="計畫代表人" name={selectedProject?.representative.name} checked={editingRecord?.attendees?.representatives} onChange={() => canEditForm && setEditingRecord({...editingRecord!, attendees: {...editingRecord!.attendees!, representatives: !editingRecord?.attendees?.representatives}})} disabled={!canEditForm} />
              <AttendeeRow label="計畫聯絡人" name={selectedProject?.liaison.name} checked={editingRecord?.attendees?.liaison} onChange={() => canEditForm && setEditingRecord({...editingRecord!, attendees: {...editingRecord!.attendees!, liaison: !editingRecord?.attendees?.liaison}})} disabled={!canEditForm} />
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" className="w-4 h-4 accent-blue-500 cursor-pointer" 
                  checked={editingRecord?.attendees?.othersChecked || false}
                  onChange={() => {
                    if (canEditForm) {
                      setEditingRecord({...editingRecord!, attendees: {...editingRecord!.attendees!, othersChecked: !editingRecord?.attendees?.othersChecked}});
                    }
                  }}
                  disabled={!canEditForm}
                />
                <span className="text-sm font-bold text-slate-600">其他人員：</span>
                <input 
                  type="text" className="border-b border-slate-300 outline-none flex-1 px-2 py-1 focus:border-blue-500" 
                  placeholder="請輸入其他出席人員姓名..."
                  value={editingRecord?.attendees?.others || ''} 
                  onChange={e => {
                    if (canEditForm) {
                      setEditingRecord({...editingRecord!, attendees: {...editingRecord!.attendees!, others: e.target.value, othersChecked: e.target.value.length > 0 ? true : editingRecord?.attendees?.othersChecked}});
                    }
                  }} 
                  disabled={!canEditForm} 
                />
              </div>
            </td>
          </tr>
          {/* 個別工作項目訪視內容 */}
          <tr>
            <td className="record-header">個別工作項目<br/>訪視內容</td>
            <td colSpan={5} className="record-cell p-0">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300">
                    <th className="px-4 py-2 border-r border-slate-300 w-1/4">工作項目</th>
                    <th className="px-4 py-2 border-r border-slate-300">訪視意見</th>
                    <th className="px-4 py-2 w-1/4">進度總結</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-slate-200">
                  {editingRecord?.visitContents?.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="border-r border-slate-300 p-2">
                        <input type="text" className="record-input text-center" value={row.workItem} onChange={e => canEditForm && updateVisitContent(row.id, 'workItem', e.target.value)} placeholder={`項目 ${idx+1}`} disabled={!canEditForm} />
                      </td>
                      <td className="border-r border-slate-300 p-2">
                        <textarea className="record-input min-h-[60px]" value={row.opinion} onChange={e => canEditForm && updateVisitContent(row.id, 'opinion', e.target.value)} disabled={!canEditForm} />
                      </td>
                      <td className="p-2">
                        <StatusPicker row={row} onChange={(f, v) => canEditForm && updateVisitContent(row.id, f as any, v)} disabled={!canEditForm} />
                      </td>
                    </tr>
                  ))}
                  {/* 固定項 1 */}
                  <tr>
                    <td className="border-r border-slate-300 p-4 bg-slate-50 font-black">全計畫捲動在地社區/部落參與人數</td>
                    <td className="border-r border-slate-300 p-2">
                      <textarea className="record-input" value={editingRecord?.communityMobilization?.opinion} onChange={e => canEditForm && setEditingRecord({...editingRecord!, communityMobilization: {...editingRecord!.communityMobilization!, opinion: e.target.value}})} disabled={!canEditForm} />
                    </td>
                    <td className="p-2">
                      <StatusPicker row={editingRecord?.communityMobilization!} onChange={(f, v) => canEditForm && setEditingRecord({...editingRecord!, communityMobilization: {...editingRecord!.communityMobilization!, [f]: v}})} disabled={!canEditForm} />
                    </td>
                  </tr>
                  {/* 固定項 2 */}
                  <tr>
                    <td className="border-r border-slate-300 p-4 bg-slate-50 font-black">全計畫串連社群個數</td>
                    <td className="border-r border-slate-300 p-2">
                      <textarea className="record-input" value={editingRecord?.communityConnection?.opinion} onChange={e => canEditForm && setEditingRecord({...editingRecord!, communityConnection: {...editingRecord!.communityConnection!, opinion: e.target.value}})} disabled={!canEditForm} />
                    </td>
                    <td className="p-2">
                      <StatusPicker row={editingRecord?.communityConnection!} onChange={(f, v) => canEditForm && setEditingRecord({...editingRecord!, communityConnection: {...editingRecord!.communityConnection!, [f]: v}})} disabled={!canEditForm} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          {/* 整體訪視重點 */}
          <tr>
            <td className="record-header">整體訪視重點</td>
            <td colSpan={5} className="record-cell">
              <textarea className="record-input min-h-[100px]" value={editingRecord?.keyPoints || ''} onChange={e => canEditForm && setEditingRecord({...editingRecord!, keyPoints: e.target.value})} placeholder="請輸入本次訪視的重點事項..." disabled={!canEditForm} />
            </td>
          </tr>
          {/* 整體訪視結果 */}
          <tr>
            <td className="record-header">整體訪視結果</td>
            <td colSpan={5} className="record-cell p-0">
              <table className="w-full border-collapse">
                <tbody className="divide-y border-slate-200">
                  <ResultRow label="1. 計畫執行進度" result={editingRecord?.overallResults?.progress!} onChange={(r) => canEditForm && setEditingRecord({...editingRecord!, overallResults: {...editingRecord!.overallResults!, progress: r}})} disabled={!canEditForm} />
                  <ResultRow label="2. 計畫執行情形" result={editingRecord?.overallResults?.content!} onChange={(r) => canEditForm && setEditingRecord({...editingRecord!, overallResults: {...editingRecord!.overallResults!, content: r}})} disabled={!canEditForm} />
                  <ResultRow label="3. 執行紀錄完善" result={editingRecord?.overallResults?.records!} onChange={(r) => canEditForm && setEditingRecord({...editingRecord!, overallResults: {...editingRecord!.overallResults!, records: r}})} disabled={!canEditForm} />
                  <ResultRow label="4. 核銷憑證完備" result={editingRecord?.overallResults?.vouchers!} onChange={(r) => canEditForm && setEditingRecord({...editingRecord!, overallResults: {...editingRecord!.overallResults!, vouchers: r}})} disabled={!canEditForm} />
                </tbody>
              </table>
            </td>
          </tr>
          {/* 訪視照片 */}
          <tr>
            <td className="record-header">訪視照片</td>
            <td colSpan={5} className="record-cell min-h-[200px]">
              <div className="flex flex-col items-center justify-center gap-4 py-6 text-slate-400">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full px-4">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-all">
                      {editingRecord?.photos?.[i] ? (
                        <>
                          <img src={editingRecord.photos[i]} className="w-full h-full object-cover" alt={`訪視照片 ${i+1}`} />
                          {canEditForm && (
                            <button 
                              onClick={() => {
                                const newPhotos = [...(editingRecord.photos || [])];
                                newPhotos.splice(i, 1);
                                setEditingRecord({...editingRecord, photos: newPhotos});
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </>
                      ) : (
                        canEditForm ? (
                          <label className="cursor-pointer flex flex-col items-center gap-2 p-4">
                            <Camera size={28} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">照片 {i+1}</span>
                            <input 
                              type="file" accept="image/*" className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const newPhotos = [...(editingRecord?.photos || [])];
                                    newPhotos[i] = ev.target?.result as string;
                                    setEditingRecord({...editingRecord!, photos: newPhotos});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex flex-col items-center gap-2 p-4">
                            <Camera size={28} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">照片 {i+1}</span>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
                {canEditForm && (
                  <p className="text-xs font-black text-amber-600 flex items-center gap-2">
                    <AlertTriangle size={14} /> 至少上傳四張照片
                  </p>
                )}
              </div>
            </td>
          </tr>
          {/* 受輔導團隊意見回應 */}
          <tr>
            <td className="record-header" colSpan={2}>受輔導團隊意見回應</td>
            <td className="record-cell" colSpan={4}>
              <textarea 
                className="w-full min-h-[100px] bg-amber-50/50 border border-amber-200 rounded-xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                placeholder="請受輔導團隊填寫對此次輔導紀錄的意見回應..."
                value={editingRecord?.operatorFeedback || ''}
                onChange={e => isOperator && setEditingRecord({...editingRecord!, operatorFeedback: e.target.value})}
                disabled={!isOperator}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 px-4">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-10">
           <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-white rounded-2xl">
                 <Calendar size={28} />
              </div>
              訪視輔導紀錄表
           </h2>
           <div className="flex gap-4">
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 font-black text-slate-800 outline-none shadow-sm"
              >
                {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button 
                onClick={() => exportCoachingRecords(coachingRecords, projects)}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <Download size={20} /> 匯出 CSV
              </button>
              {(isAdmin || isCoach) && (
                <button onClick={handleOpenNew} className="px-8 py-3 bg-[#2D3E50] text-white rounded-2xl font-black shadow-lg hover:bg-slate-700 transition-all flex items-center gap-2">
                  <Plus size={20} /> 新增紀錄表
                </button>
              )}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all p-6 group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rounded-full group-hover:bg-amber-50 transition-colors" />
               <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{record.serialNumber}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleOpenEdit(record)} className="p-2 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100" title={isOperator ? '查看紀錄' : '編輯紀錄'}><Pencil size={18} /></button>
                       {currentUserRole === UserRole.ADMIN && onDeleteRecord && (
                         deleteConfirm === record.id ? (
                           <div className="flex items-center gap-1">
                             <button onClick={() => { onDeleteRecord(record.id); setDeleteConfirm(null); }} className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600">確認</button>
                             <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded hover:bg-gray-300">取消</button>
                           </div>
                         ) : (
                           <button onClick={() => setDeleteConfirm(record.id)} className="p-2 text-red-400 bg-red-50 rounded-xl hover:bg-red-100" title="刪除紀錄"><Trash2 size={18} /></button>
                         )
                       )}
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-slate-800 truncate">{selectedProject?.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500 pt-2">
                     <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-300" /> {record.date}</div>
                     <div className="flex items-center gap-2 text-amber-600"><Info size={14} /> 第 {record.frequency} 次訪視</div>
                  </div>
                  {record.writer && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isCoachRecord(record) ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isCoachRecord(record) ? '輔導老師' : '輔導團隊'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">填寫人：{record.writer}</span>
                    </div>
                  )}
                  <button onClick={() => handleOpenEdit(record)} className="w-full py-3 bg-slate-50 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                    查看詳情 <ChevronRight size={16} />
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && editingRecord && (() => {
        const recordType = getRecordType(editingRecord);
        const canEditForm = (() => {
          if (isOperator) return false;
          if (!editingRecord.id || editingRecord.id.startsWith('cr-')) {
            const existingRecord = coachingRecords.find(r => r.id === editingRecord.id);
            if (!existingRecord) return true;
          }
          if (!editingRecord.writer) return true;
          if (isAdmin && isTeamRecord(editingRecord)) return true;
          if (isCoach && isCoachRecord(editingRecord)) return true;
          return false;
        })();
        
        const modalTitle = recordType === 'coach' ? '輔導老師訪視紀錄表' : '訪視輔導紀錄表';
        
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{modalTitle}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${recordType === 'coach' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {recordType === 'coach' ? '輔導老師版' : '輔導團隊版'}
                </span>
                {isOperator && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                    唯讀模式 - 僅可填寫「受輔導團隊意見回應」
                  </span>
                )}
                {!canEditForm && !isOperator && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                    唯讀模式
                  </span>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-slate-100/30">
              {recordType === 'coach' ? renderCoachModal(canEditForm) : renderTeamModal(canEditForm)}
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
               <div className="flex-1 flex items-center gap-4">
                  <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black">
                     <Upload size={18} /> 上傳附件備份 (掃描檔)
                  </button>
               </div>
               {(canEditForm || isOperator) && (
                <button 
                  onClick={handleSave}
                  className="px-12 py-4 bg-blue-700 text-white rounded-2xl font-black shadow-xl hover:bg-blue-800 transition-all flex items-center gap-3"
                >
                  <Save size={20} /> {isOperator ? '儲存回應' : '確認儲存填報紀錄'}
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      <style>{`
        .record-header {
           @apply bg-slate-200/50 p-4 border border-slate-300 font-black text-slate-700 text-center;
        }
        .record-cell {
           @apply p-4 border border-slate-300 font-bold text-slate-800;
        }
        .record-input {
           @apply w-full bg-transparent border-none outline-none font-bold text-slate-800 focus:bg-amber-50/50 p-1;
        }
        .inline-input {
           @apply bg-transparent border-b border-slate-300 outline-none text-center px-1 font-mono;
        }
      `}</style>
    </div>
  );
};

const AttendeeRow = ({ label, name, checked, onChange, disabled }: any) => (
   <div className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={disabled ? undefined : onChange} disabled={disabled} className="w-4 h-4" /> 
      {label}：({checked ? <span className="text-blue-600">{name}</span> : '自動帶入'})
   </div>
);

// 根據欄位顯示不同的選項文字
const getResultOptions = (label: string) => {
  if (label.includes('計畫執行情形')) {
    return [
      { status: KRStatus.AHEAD, text: '比原計畫更好' },
      { status: KRStatus.ON_TRACK, text: '與原計畫相符' },
      { status: KRStatus.DELAYED, text: '與原計畫出現落差' }
    ];
  } else if (label.includes('執行紀錄完善')) {
    return [
      { status: KRStatus.AHEAD, text: '詳實卓越且具系統性' },
      { status: KRStatus.ON_TRACK, text: '結構完整且合乎規範' },
      { status: KRStatus.DELAYED, text: '尚待補強或僅具雛形' }
    ];
  } else if (label.includes('核銷憑證完備')) {
    return [
      { status: KRStatus.AHEAD, text: '精準完備' },
      { status: KRStatus.ON_TRACK, text: '合規完整' },
      { status: KRStatus.DELAYED, text: '尚可/待加強' }
    ];
  }
  return [
    { status: KRStatus.AHEAD, text: '進度超前' },
    { status: KRStatus.ON_TRACK, text: '符合進度' },
    { status: KRStatus.DELAYED, text: '進度落後' }
  ];
};

const ResultRow = ({ label, result, onChange, disabled }: { label: string, result: AssessmentResult, onChange: (r: AssessmentResult) => void, disabled?: boolean }) => {
  const options = getResultOptions(label);
  return (
   <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="p-4 font-black text-slate-600 w-1/3">{label}：</td>
      <td className="p-4">
         <div className="flex flex-col gap-3">
            <div className="flex gap-6">
               {options.map(opt => (
                  <label key={opt.status} className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                     <input type="radio" checked={result.status === opt.status} onChange={() => !disabled && onChange({...result, status: opt.status})} disabled={disabled} /> {opt.text}
                  </label>
               ))}
            </div>
            {result.status === KRStatus.DELAYED && (
               <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-100">
                  <span className="text-[10px] font-black text-red-600 whitespace-nowrap">改進策略：</span>
                  <input type="text" className="w-full bg-transparent border-none outline-none text-xs font-bold" value={result.strategy} onChange={e => !disabled && onChange({...result, strategy: e.target.value})} placeholder="請輸入改善方針..." disabled={disabled} />
               </div>
            )}
         </div>
      </td>
   </tr>
  );
};

const StatusPicker = ({ row, onChange, disabled }: { row: VisitRow, onChange: (field: string, val: any) => void, disabled?: boolean }) => (
   <div className="space-y-3 text-xs text-left">
      <div className="flex flex-wrap gap-2">
         {[KRStatus.AHEAD, KRStatus.ON_TRACK, KRStatus.DELAYED].map(s => (
            <label key={s} className={`flex items-center gap-1 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
               <input type="radio" checked={row.status === s} onChange={() => !disabled && onChange('status', s)} disabled={disabled} /> {s}
            </label>
         ))}
      </div>
      {row.status === KRStatus.DELAYED && (
         <div className="space-y-1">
            <p className="font-black text-red-500">改進策略：</p>
            <textarea className="w-full border border-red-200 rounded p-1 outline-none font-bold" value={row.strategy} onChange={e => !disabled && onChange('strategy', e.target.value)} disabled={disabled} />
         </div>
      )}
   </div>
);

export default CoachingRecords;
