
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Project, Objective, ProjectStatus, KRStatus, KeyResult, ContactInfo, GrantStage, GrantDocStatus, BudgetItem, BudgetCategory, Vision } from '../types';
import { Plus, Trash2, Save, ArrowLeft, PlusCircle, MinusCircle, UserCircle, LayoutGrid, Clock, Target, Eye, Calculator, List, MapPin, Building, Phone, Mail, DollarSign, Users, Layers, ChevronDown } from 'lucide-react';
import { ALL_INDIGENOUS_TOWNSHIPS, TAIWAN_CITIES, getDistrictsByCity } from '../data/taiwanLocations';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { pb } from '../pocketbase';

interface ProjectFormProps {
  project?: Project;
  onBack: () => void;
  onSave: (project: Partial<Project>) => void;
  currentUserRole?: string;  // 用於控制操作人員權限
}

const emptyContact = (): ContactInfo => ({ name: '', title: '', phone: '', mobile: '', email: '' });

const defaultGrants: GrantStage[] = [
  { stage: '第 1 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
  { stage: '第 2 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
  { stage: '第 3 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
  { stage: '第 4 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
];

const safeNum = (v: unknown) => Number(v) || 0;

function normalizeProjectForSave(data: Partial<Project>): Partial<Project> {
  const budgetItems = (data.budgetItems || []).map((item) => ({
    ...item,
    quantity: safeNum(item.quantity),
    unitPrice: safeNum(item.unitPrice),
    totalPrice: safeNum(item.totalPrice),
  }));
  const visions = (data.visions || []).map((v) => ({
    ...v,
    objectives: (v.objectives || []).map((obj) => ({
      ...obj,
      weight: safeNum(obj.weight),
      keyResults: (obj.keyResults || []).map((kr) => ({
        ...kr,
        targetValue: safeNum(kr.targetValue),
        budgetAmount: safeNum(kr.budgetAmount),
        actualAmount: safeNum(kr.actualAmount),
        outcomeDescription: kr.outcomeDescription ?? '',
      })),
    })),
  }));
  const budget = budgetItems.reduce((sum, item) => sum + safeNum(item.totalPrice), 0);
  return {
    ...data,
    appliedAmount: safeNum(data.appliedAmount),
    approvedAmount: safeNum(data.approvedAmount),
    progress: safeNum(data.progress),
    spent: safeNum(data.spent),
    budget,
    budgetItems,
    visions,
    grants: data.grants,
  };
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onBack, onSave, currentUserRole }) => {
  const isAdmin = currentUserRole === 'MOC_ADMIN';
  const [formData, setFormData] = useState<Partial<Project>>(project || {
    id: `P${Date.now()}`,
    year: '115',
    status: ProjectStatus.PLANNING,
    category: '',  // 預設不勾選任何計畫類別，讓用戶自己選擇
    representative: emptyContact(),
    liaison: emptyContact(),
    chiefStaff: emptyContact(),
    commissioner: emptyContact(),
    legalAddress: '',
    contactAddress: '',
    siteTypes: ['原鄉'],  // 預設原鄉，可多選
    sites: [''],
    appliedAmount: 0,
    approvedAmount: 0,
    visions: [],
    grants: [
      { stage: '第 1 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
      { stage: '第 2 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
      { stage: '第 3 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
      { stage: '第 4 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' }
    ],
    budgetItems: [],
    period: '',  // 執行期間
    startDate: '',  // 開始日期
    endDate: '',  // 結束日期
    unitId: '',  // 單位 ID
    unitName: '',  // 單位名稱
    name: '',  // 計畫名稱
    executingUnit: '',  // 執行單位
    village: '',  // 部落/村落
    description: '',  // 計畫描述
    progress: 0,  // 進度
    spent: 0,  // 已支出
    budget: 0  // 預算
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const payloads = (rows as Record<string, unknown>[])
          .filter((row) => row['計畫名稱'] && String(row['計畫名稱']).trim() !== '')
          .map((row) => {
            const category = String(row['計畫類別'] || '').includes('都市') ? '都市文化行動' : '原鄉文化行動';
            const siteType = String(row['計畫類別'] || '').includes('都市') ? (['都市'] as const) : (['原鄉'] as const);

            return {
              name: String(row['計畫名稱'] ?? '').trim(),
              executingUnit: row['執行單位'] ? String(row['執行單位']) : '',
              unitName: row['執行單位'] ? String(row['執行單位']) : '',
              unitId: '',
              projectCode: String(row['計畫編號'] ?? '').trim() || undefined,
              category,
              siteTypes: siteType,
              sites: [] as string[],
              appliedAmount: Number(String(row['申請金額'] ?? 0).replace(/,/g, '')),
              approvedAmount: Number(String(row['核定金額'] ?? 0).replace(/,/g, '')),
              status: ProjectStatus.ONGOING,
              representative: emptyContact(),
              liaison: emptyContact(),
              commissioner: emptyContact(),
              chiefStaff: emptyContact(),
              legalAddress: '',
              contactAddress: '',
              village: '',
              startDate: '',
              endDate: '',
              description: '',
              progress: 0,
              spent: 0,
              budget: 0,
              period: '',
              year: '115',
              visions: [],
              budgetItems: [],
              grants: defaultGrants,
            } as Partial<Project>;
          });

        const results = await Promise.allSettled(
          payloads.map((p) => pb.collection('projects').create(p))
        );

        const successCount = results.filter((r) => r.status === 'fulfilled').length;
        toast.success(`成功匯入 ${successCount} 筆計畫！`);

        if (fileInputRef.current) fileInputRef.current.value = '';
        onBack();
      } catch (error) {
        console.error('Import Error:', error);
        toast.error('匯入失敗，請檢查 Excel 格式。');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // 聯絡人更新 - 使用函數式更新避免閉包問題導致的輸入框跳掉
  const updateContact = useCallback((field: 'representative' | 'liaison' | 'commissioner' | 'chiefStaff', key: keyof ContactInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...(prev[field] as ContactInfo), [key]: value }
    }));
  }, []);

  // 實施地點操作
  const addSite = () => {
    // 根據選擇的類型添加對應的默認值
    const newSite = formData.siteTypes?.includes('原鄉') && !formData.siteTypes?.includes('都市') 
      ? ALL_INDIGENOUS_TOWNSHIPS[0] || '' 
      : formData.siteTypes?.includes('都市') && !formData.siteTypes?.includes('原鄉')
      ? TAIWAN_CITIES[0] || ''
      : ''; // 如果兩個都選了，默認為空
    setFormData({ ...formData, sites: [...(formData.sites || []), newSite] });
  };

  const updateSite = (index: number, value: string) => {
    const newSites = [...(formData.sites || [])];
    newSites[index] = value;
    setFormData({ ...formData, sites: newSites });
  };

  const removeSite = (index: number) => {
    const newSites = (formData.sites || []).filter((_, i) => i !== index);
    setFormData({ ...formData, sites: newSites.length > 0 ? newSites : [''] });
  };

  // 預算操作邏輯
  const addBudgetItem = () => {
    const newItem: BudgetItem = {
      id: `bi-${Date.now()}`,
      category: BudgetCategory.OPERATING,
      name: '',
      quantity: 1,
      unit: '',
      unitPrice: 0,
      totalPrice: 0,
      description: ''
    };
    setFormData({ ...formData, budgetItems: [...(formData.budgetItems || []), newItem] });
  };

  const updateBudgetItem = (id: string, field: keyof BudgetItem, value: any) => {
    const nextItems = formData.budgetItems?.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      }
      return item;
    });
    setFormData({ ...formData, budgetItems: nextItems });
  };

  // 撥付截止日期邏輯
  const updateGrantDeadline = (idx: number, deadline: string) => {
    const nextGrants = [...(formData.grants || [])];
    if (!nextGrants[idx]) {
      nextGrants[idx] = { stage: `第 ${idx + 1} 期撥款`, documents: [], mocFinalCheck: '—' as any, deadline };
    } else {
      nextGrants[idx] = { ...nextGrants[idx], deadline };
    }
    setFormData({ ...formData, grants: nextGrants });
  };

  // ========== 願景操作 ==========
  const addVision = () => {
    const newVision: Vision = {
      id: `vision-${Date.now()}`,
      title: '',
      description: '',
      objectives: []
    };
    setFormData({ ...formData, visions: [...(formData.visions || []), newVision] });
  };

  const updateVision = (visionId: string, field: keyof Vision, value: any) => {
    setFormData({
      ...formData,
      visions: formData.visions?.map(v => v.id === visionId ? { ...v, [field]: value } : v)
    });
  };

  const removeVision = (visionId: string) => {
    setFormData({ ...formData, visions: formData.visions?.filter(v => v.id !== visionId) });
  };

  // ========== 目標操作（在願景下）==========
  const addObjective = (visionId: string) => {
    const newObj: Objective = {
      id: `obj-${Date.now()}`,
      title: '',
      weight: 0,
      keyResults: []
    };
    setFormData({
      ...formData,
      visions: formData.visions?.map(v => 
        v.id === visionId ? { ...v, objectives: [...v.objectives, newObj] } : v
      )
    });
  };

  const updateObjective = (visionId: string, objId: string, field: keyof Objective, value: any) => {
    setFormData({
      ...formData,
      visions: formData.visions?.map(v => 
        v.id === visionId ? {
          ...v,
          objectives: v.objectives.map(o => o.id === objId ? { ...o, [field]: value } : o)
        } : v
      )
    });
  };

  const removeObjective = (visionId: string, objId: string) => {
    setFormData({
      ...formData,
      visions: formData.visions?.map(v => 
        v.id === visionId ? { ...v, objectives: v.objectives.filter(o => o.id !== objId) } : v
      )
    });
  };

  // ========== 關鍵結果操作 ==========
  const addKeyResult = (visionId: string, objId: string) => {
    const newKR: KeyResult = {
      id: `kr-${Date.now()}`,
      description: '',
      targetValue: 1,
      expectedDate: '',
      budgetAmount: 0,
      actualAmount: 0,
      outcomeDescription: ''
    };
    setFormData({
      ...formData,
      visions: formData.visions?.map(v => 
        v.id === visionId ? {
          ...v,
          objectives: v.objectives.map(o => 
            o.id === objId ? { ...o, keyResults: [...o.keyResults, newKR] } : o
          )
        } : v
      )
    });
  };

  const updateKeyResult = (visionId: string, objId: string, krId: string, field: keyof KeyResult, value: any) => {
    setFormData({
      ...formData,
      visions: formData.visions?.map(v => 
        v.id === visionId ? {
          ...v,
          objectives: v.objectives.map(o => 
            o.id === objId ? {
              ...o,
              keyResults: o.keyResults.map(kr => kr.id === krId ? { ...kr, [field]: value } : kr)
            } : o
          )
        } : v
      )
    });
  };

  const removeKeyResult = (visionId: string, objId: string, krId: string) => {
    setFormData({
      ...formData,
      visions: formData.visions?.map(v => 
        v.id === visionId ? {
          ...v,
          objectives: v.objectives.map(o => 
            o.id === objId ? { ...o, keyResults: o.keyResults.filter(kr => kr.id !== krId) } : o
          )
        } : v
      )
    });
  };

  // 聯絡人輸入區塊組件 - 使用受控輸入框並避免重新渲染導致的焦點跳轉
  const renderContactSection = useCallback((title: string, field: 'representative' | 'liaison' | 'commissioner' | 'chiefStaff', Icon: any, contactData: ContactInfo | undefined) => {
    return (
      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-3 text-slate-700 font-black">
          <Icon size={20} className="text-blue-500" />
          {title}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <input 
            id={`${field}-name`}
            type="text" 
            placeholder="姓名" 
            className="form-input" 
            value={contactData?.name || ''} 
            onChange={e => updateContact(field, 'name', e.target.value)} 
          />
          <input 
            id={`${field}-title`}
            type="text" 
            placeholder="職稱" 
            className="form-input" 
            value={contactData?.title || ''} 
            onChange={e => updateContact(field, 'title', e.target.value)} 
          />
          <input 
            id={`${field}-phone`}
            type="text" 
            placeholder="電話" 
            className="form-input" 
            value={contactData?.phone || ''} 
            onChange={e => updateContact(field, 'phone', e.target.value)} 
          />
          <input 
            id={`${field}-mobile`}
            type="text" 
            placeholder="手機" 
            className="form-input" 
            value={contactData?.mobile || ''} 
            onChange={e => updateContact(field, 'mobile', e.target.value)} 
          />
          <input 
            id={`${field}-email`}
            type="email" 
            placeholder="Email" 
            className="form-input" 
            value={contactData?.email || ''} 
            onChange={e => updateContact(field, 'email', e.target.value)} 
          />
        </div>
      </div>
    );
  }, [updateContact]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style>{`
        .form-input {
          @apply w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300 transition-all;
        }
        .section-header {
          @apply bg-[#1a1a1a] p-8 flex items-center gap-4 text-white;
        }
        .section-icon {
          @apply w-10 h-10 bg-[#FFC107] rounded-full flex items-center justify-center text-black shadow-lg shadow-amber-500/20;
        }
      `}</style>

      <div className="flex items-center justify-between sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md py-4 z-20 px-2 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full shadow-sm text-gray-400">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">計畫基本資料與預算編列</h2>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black border border-emerald-200 hover:bg-emerald-100 text-sm"
              >
                匯入計畫（Excel）
              </button>
            </>
          )}
          <button 
            onClick={() => onSave(normalizeProjectForSave(formData))}
            className="px-12 py-3.5 bg-[#2D3E50] text-white rounded-2xl font-black hover:bg-slate-700 shadow-xl flex items-center gap-2 transition-all"
          >
            <Save size={18} /> 儲存變更
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {/* 1. 計畫基本資料 */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="section-header">
            <div className="section-icon"><Building size={24} /></div>
            <h3 className="text-2xl font-black tracking-tight">計畫基本資料</h3>
          </div>
          <div className="p-10 space-y-8">
            {/* 計畫名稱和執行單位 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="project-name" className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">計畫名稱 <span className="text-red-500">*</span></label>
                <input 
                  id="project-name"
                  type="text" 
                  className="form-input"
                  placeholder="請輸入計畫名稱..."
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="executing-unit" className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">執行單位 <span className="text-red-500">*</span></label>
                <input 
                  id="executing-unit"
                  type="text" 
                  className="form-input"
                  placeholder="請輸入執行單位..."
                  value={formData.executingUnit || ''}
                  onChange={e => setFormData({ ...formData, executingUnit: e.target.value })}
                />
              </div>
            </div>

            {/* 執行期間 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="start-date" className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">開始日期 <span className="text-red-500">*</span></label>
                <input 
                  id="start-date"
                  type="date" 
                  className="form-input"
                  value={formData.startDate || ''}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="end-date" className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">結束日期 <span className="text-red-500">*</span></label>
                <input 
                  id="end-date"
                  type="date" 
                  className="form-input"
                  value={formData.endDate || ''}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="period" className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">執行期間（文字）</label>
                <input 
                  id="period"
                  type="text" 
                  className="form-input"
                  placeholder="例：115年1月-12月"
                  value={formData.period || ''}
                  onChange={e => setFormData({ ...formData, period: e.target.value })}
                />
              </div>
            </div>

            {/* 計畫代表人 */}
            {renderContactSection("計畫代表人", "representative", UserCircle, formData.representative as ContactInfo)}
            
            {/* 計畫聯絡人 */}
            {renderContactSection("計畫聯絡人", "liaison", Users, formData.liaison as ContactInfo)}

            {/* 地址資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="legal-address" className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">立案地址</label>
                <input 
                  id="legal-address"
                  type="text" 
                  className="form-input"
                  placeholder="請輸入立案地址..."
                  value={formData.legalAddress || ''}
                  onChange={e => setFormData({ ...formData, legalAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-address" className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">聯絡地址</label>
                <input 
                  id="contact-address"
                  type="text" 
                  className="form-input"
                  placeholder="請輸入聯絡地址..."
                  value={formData.contactAddress || ''}
                  onChange={e => setFormData({ ...formData, contactAddress: e.target.value })}
                />
              </div>
            </div>

            {/* 提案類別 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Layers size={16} className="text-purple-500" /> 提案類別：請擇一打勾 <span className="text-red-500">*</span>
              </label>
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-4">
                {/* 原鄉文化行動計畫類 */}
                <div className="space-y-2">
                  <p className="text-sm font-black text-slate-700">■ 1. 原鄉文化行動計畫類：</p>
                  <div className="flex items-center gap-6 pl-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="category"
                        checked={formData.category === '原鄉文化行動-無涉產業及就業'} 
                        onChange={() => setFormData({ ...formData, category: '原鄉文化行動-無涉產業及就業' })} 
                        className="w-4 h-4 text-purple-600 rounded"
                        style={{ appearance: 'none', border: '2px solid #9333ea', backgroundColor: formData.category === '原鄉文化行動-無涉產業及就業' ? '#9333ea' : 'white' }}
                      />
                      <span className="text-sm font-bold text-slate-600">(1) 無涉產業及就業</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="category"
                        checked={formData.category === '原鄉文化行動-涉及產業及就業'} 
                        onChange={() => setFormData({ ...formData, category: '原鄉文化行動-涉及產業及就業' })} 
                        className="w-4 h-4 text-purple-600 rounded"
                        style={{ appearance: 'none', border: '2px solid #9333ea', backgroundColor: formData.category === '原鄉文化行動-涉及產業及就業' ? '#9333ea' : 'white' }}
                      />
                      <span className="text-sm font-bold text-slate-600">(2) 涉及產業及就業</span>
                    </label>
                  </div>
                </div>
                {/* 都市文化行動計畫類 */}
                <div className="space-y-2">
                  <p className="text-sm font-black text-slate-700">■ 2. 都市文化行動計畫類：</p>
                  <div className="flex items-center gap-6 pl-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="category"
                        checked={formData.category === '都市文化行動-無涉產業及就業'} 
                        onChange={() => setFormData({ ...formData, category: '都市文化行動-無涉產業及就業' })} 
                        className="w-4 h-4 text-purple-600 rounded"
                        style={{ appearance: 'none', border: '2px solid #9333ea', backgroundColor: formData.category === '都市文化行動-無涉產業及就業' ? '#9333ea' : 'white' }}
                      />
                      <span className="text-sm font-bold text-slate-600">(1) 無涉產業及就業</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="category"
                        checked={formData.category === '都市文化行動-涉及產業及就業'} 
                        onChange={() => setFormData({ ...formData, category: '都市文化行動-涉及產業及就業' })} 
                        className="w-4 h-4 text-purple-600 rounded"
                        style={{ appearance: 'none', border: '2px solid #9333ea', backgroundColor: formData.category === '都市文化行動-涉及產業及就業' ? '#9333ea' : 'white' }}
                      />
                      <span className="text-sm font-bold text-slate-600">(2) 涉及產業及就業</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 實施地點 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-500" /> 實施地點
                </label>
                <button onClick={addSite} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 flex items-center gap-1">
                  <Plus size={14} /> 新增地點
                </button>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-bold text-slate-600">類型：</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.siteTypes?.includes('原鄉')} 
                    onChange={(e) => {
                      const newTypes = e.target.checked 
                        ? [...(formData.siteTypes || []), '原鄉'] 
                        : (formData.siteTypes || []).filter(t => t !== '原鄉');
                      // 至少要選一個
                      if (newTypes.length > 0) {
                        setFormData({ ...formData, siteTypes: newTypes as ('原鄉' | '都市')[] });
                      }
                    }} 
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm font-bold">原鄉</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.siteTypes?.includes('都市')} 
                    onChange={(e) => {
                      const newTypes = e.target.checked 
                        ? [...(formData.siteTypes || []), '都市'] 
                        : (formData.siteTypes || []).filter(t => t !== '都市');
                      // 至少要選一個
                      if (newTypes.length > 0) {
                        setFormData({ ...formData, siteTypes: newTypes as ('原鄉' | '都市')[] });
                      }
                    }} 
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm font-bold">都市</span>
                </label>
              </div>
              
              {/* 原鄉：顯示原住民鄉鎮下拉選單 */}
              {formData.siteTypes?.includes('原鄉') && (
                <div className="space-y-3">
                  {formData.sites?.filter(s => s && ALL_INDIGENOUS_TOWNSHIPS.includes(s)).map((site, idx) => (
                    <div key={`site-${idx}`} className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <select
                          id={`site-${idx}`}
                          className="form-input w-full appearance-none pr-10"
                          value={site}
                          onChange={e => updateSite(idx, e.target.value)}
                        >
                          <option value="">選擇鄉鎮</option>
                          {ALL_INDIGENOUS_TOWNSHIPS.map(township => (
                            <option key={township} value={township}>{township}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      {(formData.sites?.length || 0) > 1 && (
                        <button onClick={() => removeSite(idx)} className="p-2 text-red-300 hover:text-red-500">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* 都市：顯示縣市+鄉鎮市區兩層下拉選單 */}
              {formData.siteTypes?.includes('都市') && (
                <div className="space-y-3">
                  {formData.sites?.filter(s => s && !ALL_INDIGENOUS_TOWNSHIPS.includes(s)).map((site, idx) => {
                    // 解析已選擇的縣市和鄉鎮
                    const parts = site.split(/(?<=市|縣)/);
                    const selectedCity = parts[0] || '';
                    const selectedDistrict = parts[1] || '';
                    const districts = selectedCity ? getDistrictsByCity(selectedCity) : [];
                    
                    return (
                      <div key={`site-${idx}`} className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <select
                            className="form-input w-full appearance-none pr-10"
                            value={selectedCity}
                            onChange={e => {
                              const newCity = e.target.value;
                              updateSite(idx, newCity);
                            }}
                          >
                            <option value="">選擇縣市</option>
                            {TAIWAN_CITIES.map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative flex-1">
                          <select
                            className="form-input w-full appearance-none pr-10"
                            value={selectedDistrict}
                            onChange={e => {
                              const newDistrict = e.target.value;
                              updateSite(idx, selectedCity + newDistrict);
                            }}
                            disabled={!selectedCity}
                          >
                            <option value="">請選擇鄉鎮市區...</option>
                            {districts.map(district => (
                              <option key={district} value={district}>{district}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        {(formData.sites?.length || 0) > 1 && (
                          <button onClick={() => removeSite(idx)} className="p-2 text-red-300 hover:text-red-500">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 金額資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-3">
                <label htmlFor="applied-amount" className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign size={16} /> 申請金額
                </label>
                <input 
                  id="applied-amount"
                  type="number" 
                  className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-2xl font-black text-blue-600 outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={formData.appliedAmount ?? ''}
                  onChange={e => setFormData({ ...formData, appliedAmount: safeNum(e.target.value) })}
                />
              </div>
              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 space-y-3">
                <label htmlFor="approved-amount" className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign size={16} /> 核定金額
                </label>
                <input 
                  id="approved-amount"
                  type="number" 
                  className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-2xl font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10"
                  value={formData.approvedAmount ?? ''}
                  onChange={e => setFormData({ ...formData, approvedAmount: safeNum(e.target.value) })}
                />
              </div>
            </div>

            {/* 輔導老師 */}
            {renderContactSection("輔導老師", "commissioner", UserCircle, formData.commissioner as ContactInfo)}
            
            {/* 主責人員 */}
            {renderContactSection("主責人員", "chiefStaff", UserCircle, formData.chiefStaff as ContactInfo)}
          </div>
        </section>

        {/* 2. 計畫願景與 OKR（三層結構：願景 → 目標 → 關鍵結果）*/}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] p-8 flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Layers size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">願景與 OKR 管理</h3>
                <p className="text-white/60 text-sm mt-1">願景 → 目標 (Objective) → 關鍵結果 (Key Result)</p>
              </div>
            </div>
            <button onClick={addVision} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all">
              <PlusCircle size={18} /> 新增願景
            </button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {formData.visions?.map((vision, vIdx) => (
              <div key={vision.id} className="p-8 space-y-6">
                {/* 願景標題 */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-black text-lg">
                        {vIdx + 1}
                      </div>
                      <span className="text-xs font-black text-amber-600 uppercase tracking-widest">願景 VISION</span>
                    </div>
                    <button onClick={() => removeVision(vision.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-3 text-xl font-black text-slate-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    placeholder="請輸入願景標題..."
                    value={vision.title}
                    onChange={e => updateVision(vision.id, 'title', e.target.value)}
                  />
                  <textarea 
                    className="w-full mt-3 bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm text-slate-600 outline-none focus:border-amber-300 min-h-[80px] resize-none"
                    placeholder="願景描述（選填）..."
                    value={vision.description || ''}
                    onChange={e => updateVision(vision.id, 'description', e.target.value)}
                  />
                </div>

                {/* 該願景下的目標列表 */}
                <div className="pl-6 border-l-4 border-amber-200 space-y-6">
                  {vision.objectives.map((obj, oIdx) => (
                    <div key={obj.id} className="bg-slate-50 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                            O{oIdx + 1}
                          </div>
                          <input 
                            type="text" 
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-black text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            placeholder="請輸入目標名稱..."
                            value={obj.title}
                            onChange={e => updateObjective(vision.id, obj.id, 'title', e.target.value)}
                          />
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-400">權重</span>
                            <input 
                              type="number" 
                              className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold"
                              value={obj.weight}
                              onChange={e => updateObjective(vision.id, obj.id, 'weight', Number(e.target.value))}
                            />
                            <span className="text-xs font-bold text-slate-400">%</span>
                          </div>
                        </div>
                        <button onClick={() => removeObjective(vision.id, obj.id)} className="p-2 text-red-200 hover:text-red-500">
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* 關鍵結果表格 */}
                      <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              <th className="px-4 py-3 text-left">關鍵結果 (KR)</th>
                              <th className="px-4 py-3 text-center w-32">預計完成日期</th>
                              <th className="px-4 py-3 text-right w-28">預算金額</th>
                              <th className="px-4 py-3 text-right w-28">實際執行金額</th>
                              <th className="px-4 py-3 text-left min-w-[180px]">執行成果說明</th>
                              <th className="px-4 py-3 w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {obj.keyResults.map((kr, krIdx) => (
                              <tr key={kr.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">KR{krIdx + 1}</span>
                                    <input 
                                      type="text" 
                                      className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 min-w-0"
                                      placeholder="關鍵結果描述..."
                                      value={kr.description}
                                      onChange={e => updateKeyResult(vision.id, obj.id, kr.id, 'description', e.target.value)}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center"
                                    value={kr.expectedDate}
                                    onChange={e => updateKeyResult(vision.id, obj.id, kr.id, 'expectedDate', e.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-right font-mono text-blue-600"
                                    value={kr.budgetAmount ?? ''}
                                    onChange={e => updateKeyResult(vision.id, obj.id, kr.id, 'budgetAmount', safeNum(e.target.value))}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-right font-mono text-emerald-600"
                                    value={kr.actualAmount ?? ''}
                                    onChange={e => updateKeyResult(vision.id, obj.id, kr.id, 'actualAmount', safeNum(e.target.value))}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700"
                                    placeholder="執行成果說明..."
                                    value={kr.outcomeDescription ?? ''}
                                    onChange={e => updateKeyResult(vision.id, obj.id, kr.id, 'outcomeDescription', e.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button onClick={() => removeKeyResult(vision.id, obj.id, kr.id)} className="text-red-200 hover:text-red-500">
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                          <button 
                            onClick={() => addKeyResult(vision.id, obj.id)} 
                            className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Plus size={14} /> 新增關鍵結果
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 新增目標按鈕 */}
                  <button 
                    onClick={() => addObjective(vision.id)} 
                    className="w-full py-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 font-black hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center gap-2 transition-all"
                  >
                    <PlusCircle size={18} /> 在此願景下新增目標
                  </button>
                </div>
              </div>
            ))}

            {(!formData.visions || formData.visions.length === 0) && (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Layers size={40} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold mb-4">尚未設定願景</p>
                <button 
                  onClick={addVision}
                  className="px-6 py-3 bg-amber-500 text-black rounded-xl font-black hover:bg-amber-400 inline-flex items-center gap-2"
                >
                  <PlusCircle size={18} /> 新增第一個願景
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 3. 經費預算明細 */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
           <div className="bg-[#2E7D5D] p-8 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                 <Calculator size={28} />
                 <h3 className="text-2xl font-black tracking-tight">經費預算編列</h3>
              </div>
              <button onClick={addBudgetItem} className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-black flex items-center gap-2">
                 <Plus size={18} /> 新增細目
              </button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                 <thead>
                    <tr className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">
                       <th className="px-8 py-5">類別</th>
                       <th className="px-8 py-5">項目名稱</th>
                       <th className="px-8 py-5 text-center">數量/單位</th>
                       <th className="px-8 py-5 text-right">預算金額 (單價)</th>
                       <th className="px-8 py-5 text-right">總價</th>
                       <th className="px-8 py-5"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {formData.budgetItems?.map((item) => (
                       <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-8 py-4">
                             <select className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold" value={item.category} onChange={e => updateBudgetItem(item.id, 'category', e.target.value as BudgetCategory)}>
                                {Object.values(BudgetCategory).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                          </td>
                          <td className="px-8 py-4">
                             <input type="text" className="w-full bg-transparent border-b border-slate-100 font-bold text-slate-700 outline-none focus:border-emerald-500" value={item.name} onChange={e => updateBudgetItem(item.id, 'name', e.target.value)} />
                          </td>
                          <td className="px-8 py-4 text-center">
                             <div className="flex items-center justify-center gap-2">
                                <input type="number" className="w-12 text-center bg-slate-50 rounded p-1 font-mono" value={item.quantity} onChange={e => updateBudgetItem(item.id, 'quantity', Number(e.target.value))} />
                                <input type="text" className="w-12 text-center bg-slate-50 rounded p-1" placeholder="單位" value={item.unit} onChange={e => updateBudgetItem(item.id, 'unit', e.target.value)} />
                             </div>
                          </td>
                          <td className="px-8 py-4 text-right">
                             <input type="number" className="w-24 text-right bg-slate-50 rounded p-1 font-mono" value={item.unitPrice} onChange={e => updateBudgetItem(item.id, 'unitPrice', Number(e.target.value))} />
                          </td>
                          <td className="px-8 py-4 text-right">
                             <span className="font-black text-emerald-600 font-mono">${item.totalPrice.toLocaleString()}</span>
                          </td>
                          <td className="px-8 py-4">
                             <button onClick={() => setFormData({...formData, budgetItems: formData.budgetItems?.filter(i => i.id !== item.id)})} className="text-red-200 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              {(!formData.budgetItems || formData.budgetItems.length === 0) && (
                <div className="p-12 text-center text-slate-300 font-bold">
                  尚未新增預算項目
                </div>
              )}
              {formData.budgetItems && formData.budgetItems.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">總計</span>
                    <div className="text-3xl font-black text-emerald-600 font-mono">
                      ${formData.budgetItems.reduce((sum, item) => sum + safeNum(item.totalPrice), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
           </div>
        </section>

        {/* 4. 各期款預計完成日期 */}
        <section className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="section-header">
            <div className="section-icon"><Clock size={24} /></div>
            <h3 className="text-2xl font-black tracking-tight">各期款預計完成日期</h3>
          </div>
          <div className="p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(stage => (
                <div key={stage} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">第 {stage} 期款</label>
                  <input 
                    type="date" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
                    value={formData.grants?.[stage - 1]?.deadline || ''}
                    onChange={e => updateGrantDeadline(stage - 1, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectForm;
