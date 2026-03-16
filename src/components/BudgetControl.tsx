
import React, { useState } from 'react';
import { Project, BudgetItem, BudgetCategory } from '../types';
import { Plus, Trash2, Save, DollarSign, Calculator, FileSpreadsheet } from 'lucide-react';

interface BudgetControlProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
}

interface BudgetRow {
  id: string;
  category: BudgetCategory;
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  calculationMethod: string;
}

const BudgetControl: React.FC<BudgetControlProps> = ({ projects, onUpdateProject }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // 將 budgetItems 轉換為表格行格式
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>(() => {
    if (!selectedProject) return [];
    return selectedProject.budgetItems.map(item => ({
      id: item.id,
      category: item.category,
      item: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      calculationMethod: item.description
    }));
  });

  // 計算各類別小計
  const personnelTotal = budgetRows.filter(r => r.category === BudgetCategory.PERSONNEL).reduce((sum, r) => sum + r.totalPrice, 0);
  const operatingTotal = budgetRows.filter(r => r.category === BudgetCategory.OPERATING).reduce((sum, r) => sum + r.totalPrice, 0);
  const miscTotal = budgetRows.filter(r => r.category === BudgetCategory.MISCELLANEOUS).reduce((sum, r) => sum + r.totalPrice, 0);
  const grandTotal = personnelTotal + operatingTotal + miscTotal;

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setBudgetRows(project.budgetItems.map(item => ({
        id: item.id,
        category: item.category,
        item: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        calculationMethod: item.description
      })));
    }
  };

  const addRow = (category: BudgetCategory) => {
    const newRow: BudgetRow = {
      id: `budget-${Date.now()}`,
      category,
      item: '',
      quantity: 1,
      unit: '式',
      unitPrice: 0,
      totalPrice: 0,
      calculationMethod: ''
    };
    setBudgetRows([...budgetRows, newRow]);
  };

  const updateRow = (id: string, field: keyof BudgetRow, value: any) => {
    setBudgetRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      // 自動計算總價
      if (field === 'quantity' || field === 'unitPrice') {
        updated.totalPrice = updated.quantity * updated.unitPrice;
      }
      return updated;
    }));
  };

  const deleteRow = (id: string) => {
    setBudgetRows(prev => prev.filter(row => row.id !== id));
  };

  const handleSave = () => {
    if (!selectedProject) return;
    const updatedBudgetItems: BudgetItem[] = budgetRows.map(row => ({
      id: row.id,
      category: row.category,
      name: row.item,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice,
      description: row.calculationMethod
    }));
    onUpdateProject({
      ...selectedProject,
      budgetItems: updatedBudgetItems,
      budget: grandTotal
    });
    alert('預算表格已儲存！');
  };

  const renderCategorySection = (category: BudgetCategory, title: string, subtotal: number) => {
    const rows = budgetRows.filter(r => r.category === category);
    return (
      <>
        <tr className="bg-slate-100">
          <td colSpan={7} className="px-4 py-3 font-black text-slate-700 text-lg border border-slate-300">
            {title}
            <button 
              onClick={() => addRow(category)}
              className="ml-4 px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={14} className="inline mr-1" /> 新增項目
            </button>
          </td>
        </tr>
        {rows.map((row, idx) => (
          <tr key={row.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-3 border border-slate-300">
              <input 
                type="text" 
                className="w-full bg-transparent outline-none font-bold text-slate-700"
                value={row.item}
                onChange={(e) => updateRow(row.id, 'item', e.target.value)}
                placeholder="項目名稱"
              />
            </td>
            <td className="px-4 py-3 border border-slate-300 w-20">
              <input 
                type="number" 
                className="w-full bg-transparent outline-none font-bold text-slate-700 text-center"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, 'quantity', Number(e.target.value))}
              />
            </td>
            <td className="px-4 py-3 border border-slate-300 w-20">
              <input 
                type="text" 
                className="w-full bg-transparent outline-none font-bold text-slate-700 text-center"
                value={row.unit}
                onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
              />
            </td>
            <td className="px-4 py-3 border border-slate-300 w-28">
              <input 
                type="number" 
                className="w-full bg-transparent outline-none font-bold text-slate-700 text-right"
                value={row.unitPrice}
                onChange={(e) => updateRow(row.id, 'unitPrice', Number(e.target.value))}
              />
            </td>
            <td className="px-4 py-3 border border-slate-300 w-28 text-right font-black text-emerald-600">
              ${row.totalPrice.toLocaleString()}
            </td>
            <td className="px-4 py-3 border border-slate-300">
              <input 
                type="text" 
                className="w-full bg-transparent outline-none font-bold text-slate-500 text-sm"
                value={row.calculationMethod}
                onChange={(e) => updateRow(row.id, 'calculationMethod', e.target.value)}
                placeholder="計算方式及說明"
              />
            </td>
            <td className="px-4 py-3 border border-slate-300 w-16 text-center">
              <button 
                onClick={() => deleteRow(row.id)}
                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
        <tr className="bg-slate-50">
          <td colSpan={4} className="px-4 py-3 border border-slate-300 text-right font-black text-slate-600">小計</td>
          <td className="px-4 py-3 border border-slate-300 text-right font-black text-blue-600 text-lg">${subtotal.toLocaleString()}</td>
          <td colSpan={2} className="border border-slate-300"></td>
        </tr>
      </>
    );
  };

  if (!selectedProject) {
    return <div className="p-10 text-center text-slate-400">請先選擇計畫</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500 px-4">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        {/* 標題區 */}
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl">
              <FileSpreadsheet size={28} />
            </div>
            財務管控表單
          </h2>
          <div className="flex gap-4">
            <select 
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 font-black text-slate-800 outline-none shadow-sm"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button 
              onClick={handleSave}
              className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <Save size={20} /> 儲存預算表
            </button>
          </div>
        </div>

        {/* 預算表格 - 類似 Excel 格式 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-200">
                <th className="px-4 py-4 border border-slate-300 text-left font-black text-slate-700">工作事項/關鍵結果</th>
                <th className="px-4 py-4 border border-slate-300 text-center font-black text-slate-700 w-20">數量</th>
                <th className="px-4 py-4 border border-slate-300 text-center font-black text-slate-700 w-20">單位</th>
                <th className="px-4 py-4 border border-slate-300 text-center font-black text-slate-700 w-28">單價</th>
                <th className="px-4 py-4 border border-slate-300 text-center font-black text-slate-700 w-28">總價(元)</th>
                <th className="px-4 py-4 border border-slate-300 text-left font-black text-slate-700">計算方式及說明</th>
                <th className="px-4 py-4 border border-slate-300 text-center font-black text-slate-700 w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {renderCategorySection(BudgetCategory.PERSONNEL, '人事費', personnelTotal)}
              {renderCategorySection(BudgetCategory.OPERATING, '業務費', operatingTotal)}
              {renderCategorySection(BudgetCategory.MISCELLANEOUS, '雜支', miscTotal)}
              
              {/* 總計 */}
              <tr className="bg-amber-50">
                <td colSpan={4} className="px-4 py-4 border-2 border-slate-400 text-right font-black text-slate-800 text-lg">總計</td>
                <td className="px-4 py-4 border-2 border-slate-400 text-right font-black text-amber-600 text-xl">${grandTotal.toLocaleString()}</td>
                <td colSpan={2} className="border-2 border-slate-400"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 統計摘要 */}
        <div className="mt-8 grid grid-cols-4 gap-6">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">人事費</p>
            <p className="text-2xl font-black text-blue-600">${personnelTotal.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
            <p className="text-xs font-black text-purple-400 uppercase tracking-widest mb-2">業務費</p>
            <p className="text-2xl font-black text-purple-600">${operatingTotal.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">雜支</p>
            <p className="text-2xl font-black text-slate-600">${miscTotal.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">總預算</p>
            <p className="text-2xl font-black text-emerald-600">${grandTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetControl;
