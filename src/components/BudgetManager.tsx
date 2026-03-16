
import React, { useMemo, useState } from 'react';
import { Project, BudgetItem, BudgetCategory, MonthlyReport, UserRole } from '../types';
import { Calculator, FileDown, Plus, Trash2, ChevronDown, AlertCircle, Save, X, List } from 'lucide-react';

interface BudgetManagerProps {
  projects: Project[];
  monthlyReports: MonthlyReport[];
  onUpdateProject: (project: Project) => void;
  currentUserRole?: string;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({ projects, monthlyReports, onUpdateProject, currentUserRole }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isAdmin = currentUserRole === UserRole.ADMIN;

  const budgetItems = selectedProject?.budgetItems || [];

  const handleUpdateItem = (id: string, field: keyof BudgetItem, value: any) => {
    if (!selectedProject) return;
    const nextItems = budgetItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      }
      return item;
    });
    onUpdateProject({ ...selectedProject, budgetItems: nextItems });
  };

  const addItem = () => {
    if (!selectedProject) return;
    // 修正：預先生成完整 ID，解決截圖中遇到的 ID null 導致儲存失敗問題
    const newItem: BudgetItem = {
      id: `bi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: BudgetCategory.PERSONNEL,
      name: '',
      quantity: 1,
      unit: '',
      unitPrice: 0,
      totalPrice: 0,
      description: ''
    };
    onUpdateProject({ ...selectedProject, budgetItems: [...budgetItems, newItem] });
  };

  const removeItem = (id: string) => {
    if (!selectedProject) return;
    onUpdateProject({ ...selectedProject, budgetItems: budgetItems.filter(i => i.id !== id) });
  };

  const totalPlanned = budgetItems.reduce((acc, i) => acc + i.totalPrice, 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">經費預算與支出管理</h1>
        <div className="relative w-72">
           <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-gray-800 outline-none shadow-sm appearance-none cursor-pointer"
           >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
           <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* 經費預算明細區塊 - 樣式比照截圖 */}
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
        {/* 深綠色表頭列 */}
        <div className="bg-[#2E7D5D] px-10 py-6 flex items-center justify-between text-white">
           <div className="flex items-center gap-4">
              <List size={24} />
              <h3 className="text-2xl font-black tracking-tight">經費預算明細</h3>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => onUpdateProject(selectedProject!)}
                className="px-8 py-2.5 bg-[#4CAF8D] hover:bg-[#3E9275] rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-sm"
              >
                <Save size={18} /> 儲存
              </button>
              <button className="px-8 py-2.5 bg-transparent border border-white/30 hover:bg-white/10 rounded-xl font-black text-sm transition-all flex items-center gap-2">
                <X size={18} /> 取消
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-slate-700 text-[13px] font-black text-left">
                <th className="px-6 py-5">項目類別</th>
                <th className="px-6 py-5">內容名稱</th>
                <th className="px-6 py-5 text-center w-24">數量</th>
                <th className="px-6 py-5 text-center w-24">單位</th>
                <th className="px-6 py-5 text-right w-32">單價</th>
                <th className="px-6 py-5 text-right w-40">總價</th>
                <th className="px-6 py-5 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <select 
                      className="form-input-budget text-slate-800"
                      value={item.category}
                      onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value as BudgetCategory)}
                    >
                      <option value={BudgetCategory.PERSONNEL}>人事費</option>
                      <option value={BudgetCategory.OPERATING}>業務費</option>
                      <option value={BudgetCategory.MISCELLANEOUS}>雜支</option>
                    </select>
                  </td>
                  <td className="px-6 py-5">
                    <input 
                      type="text" className="form-input-budget" placeholder="項目名稱"
                      value={item.name} onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-5">
                    <input 
                      type="number" className="form-input-budget text-center"
                      value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-5">
                    <input 
                      type="text" className="form-input-budget text-center" placeholder="月"
                      value={item.unit} onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-5">
                    <input 
                      type="number" className="form-input-budget text-right font-mono"
                      value={item.unitPrice} onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-xl font-black text-[#2E7D5D] font-mono">
                      ${item.totalPrice.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500 transition-all">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className="p-8">
                  <button 
                    onClick={addItem}
                    className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-sm font-black text-slate-400 hover:border-[#2E7D5D] hover:text-[#2E7D5D] hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-3"
                  >
                    <Plus size={24} /> 新增下一筆經費細目
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1A2A38] p-10 rounded-[48px] shadow-2xl text-white">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前累計總預算</p>
             <p className="text-6xl font-black text-amber-400 font-mono tracking-tighter">
                ${totalPlanned.toLocaleString()}
             </p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-slate-500 italic">* 核定總額以文化部發文日期為準</p>
          </div>
        </div>
      </div>

      <style>{`
        .form-input-budget {
          @apply w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-[#2E7D5D] outline-none shadow-sm transition-all;
        }
      `}</style>
    </div>
  );
};

export default BudgetManager;
