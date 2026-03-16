
import React, { useState, useRef } from 'react';
import { Project, ProjectStatus, UserRole, ContactInfo, GrantStage } from '../types';
import { Search, Plus, Building2, Trash2, Pencil, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { pb } from '../pocketbase';

const emptyContact = (): ContactInfo => ({ name: '', title: '', phone: '', mobile: '', email: '' });
const defaultGrants: GrantStage[] = [
  { stage: '第 1 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
  { stage: '第 2 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
  { stage: '第 3 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
  { stage: '第 4 期撥款', documents: [], mocFinalCheck: '—' as any, deadline: '' },
];

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onAddNew?: () => void;
  onDeleteProject?: (projectId: string) => void;
  userRole?: string;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelectProject, onAddNew, onDeleteProject, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const isAdmin = userRole === UserRole.ADMIN;
  const isCoach = userRole === UserRole.COACH;
  const canEdit = isAdmin; // 只有管理員可以編輯，輔導老師只能閱覽
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** 金額清理：自動移除數字中的逗號後轉為數字 */
  const parseAmount = (val: unknown): number => {
    if (val == null || val === '') return 0;
    const str = String(val).replace(/,/g, '').trim();
    const num = parseFloat(str);
    return Number.isNaN(num) ? 0 : num;
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const mapping = (row: Record<string, unknown>): Partial<Project> => {
        const rawCategory = String(row['計畫類別'] ?? row['category'] ?? '').trim();
        const category = rawCategory || '原鄉文化行動';
        const siteTypes: ('原鄉' | '都市')[] = rawCategory.includes('都市') ? ['都市'] : ['原鄉'];

        const name = String(row['計畫名稱'] ?? row['project_name'] ?? row['name'] ?? '').trim();
        const unitName = String(row['執行單位'] ?? row['unit_name'] ?? row['executingUnit'] ?? '').trim();
        const projectCode = String(row['計畫編號'] ?? row['project_id'] ?? '').trim() || undefined;
        const appliedAmount = parseAmount(row['申請金額'] ?? row['applied_amount'] ?? 0);
        const approvedAmount = parseAmount(row['核定金額'] ?? row['approved_amount'] ?? 0);

        return {
          name,
          executingUnit: unitName,
          unitName,
          unitId: '',
          projectCode,
          year: '115',
          category,
          siteTypes,
          sites: [],
          appliedAmount,
          approvedAmount,
          status: ProjectStatus.PLANNING,
          progress: 0,
          period: '',
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
          spent: 0,
          budget: 0,
          visions: [],
          budgetItems: [],
          grants: defaultGrants,
        };
      };

      const payloads = rows.map(mapping).filter(p => p.name && p.unitName);

      const results = await Promise.all(
        payloads.map(p =>
          pb.collection('projects').create(p).then(() => true).catch(err => {
            console.error('匯入單筆失敗：', p.name, err);
            return false;
          })
        )
      );
      const successCount = results.filter(Boolean).length;

      toast.success(`成功匯入 ${successCount} 筆計畫${successCount < payloads.length ? `，${payloads.length - successCount} 筆失敗` : ''}`);
    } catch (error) {
      console.error('Excel 匯入失敗：', error);
      toast.error('Excel 匯入失敗，請確認檔案格式。');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.projectCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.village || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.executingUnit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.unitName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ONGOING: return 'bg-emerald-100 text-emerald-700';
      case ProjectStatus.STALLED: return 'bg-red-100 text-red-700';
      case ProjectStatus.PLANNING: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.COMPLETED: return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-black text-gray-800 tracking-tight">年度計畫管考清單</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="搜尋計畫、單位或地點..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-72 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-all"
              >
                <FileSpreadsheet size={16} /> 匯入計畫
              </button>
              {onAddNew && (
                <button 
                  onClick={onAddNew}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 shadow-md transition-all"
                >
                  <Plus size={16} /> 新增計畫案
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400 text-[11px] uppercase font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">計畫編號</th>
              <th className="px-6 py-4">計畫名稱</th>
              <th className="px-6 py-4">執行單位</th>
              <th className="px-6 py-4">計畫類別</th>
              <th className="px-6 py-4">累積執行進度</th>
              <th className="px-6 py-4 text-right">預算執行率</th>
              <th className="px-6 py-4">當前狀態</th>
              <th className="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredProjects.map((project) => (
              <tr 
                key={project.id} 
                className="hover:bg-amber-50/20 cursor-pointer transition-colors group" 
                onClick={() => onSelectProject(project)}
              >
                <td className="px-6 py-5 text-sm font-mono text-slate-500">
                  {project.projectCode || '-'}
                </td>
                <td className="px-6 py-5 font-bold text-gray-800 group-hover:text-amber-700 transition-colors">{project.name}</td>
                <td className="px-6 py-5 text-sm text-gray-600 flex items-center gap-1">
                  <Building2 size={14} className="text-slate-400" /> {project.executingUnit || project.unitName || '—'}
                </td>
                <td className="px-6 py-5">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                    {project.category}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Number(project.progress) || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-black text-gray-700 w-8">{Number(project.progress) || 0}%</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="text-xs font-black text-gray-800">${((Number(project.spent) || 0) / 1000).toFixed(0)}k</div>
                  <div className="text-[10px] text-gray-400">執行率 {(Number(project.budget) || 0) > 0 ? (((Number(project.spent) || 0) / (Number(project.budget) || 1)) * 100).toFixed(1) : '0'}%</div>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyle(project.status)}`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelectProject(project); }}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="編輯計畫"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {isAdmin && onDeleteProject && (
                      deleteConfirm === project.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => { onDeleteProject(project.id); setDeleteConfirm(null); }}
                            className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600"
                          >
                            確認
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded hover:bg-gray-300"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                          className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="刪除計畫"
                        >
                          <Trash2 size={16} />
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProjects.length === 0 && (
          <div className="p-12 text-center text-gray-400 font-medium">
            找不到符合條件的計畫案
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
