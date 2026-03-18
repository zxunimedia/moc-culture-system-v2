
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ProjectForm from './components/ProjectForm';
import ProjectExecutionControl from './components/ProjectExecutionControl';
import CoachingRecords from './components/CoachingRecords';
import CoachingFinalReport from './components/CoachingFinalReport';
import GrantProgress from './components/GrantProgress';
import DataMigration from './components/DataMigration';
import Login from './components/Login';
import AccountManagement from './components/AccountManagement';
import DownloadCenter from './components/DownloadCenter';
import PermissionManagement from './components/PermissionManagement';
import { Project, ProjectStatus, KRStatus, Report, MonthlyReport, CoachingRecord, User, UserRole, BudgetCategory, MOCCheckStatus } from './types';
import { UserCircle, TrendingUp, Target, FileText, Mountain, Pencil, Trash2, LogOut, Plus } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { pb } from './pocketbase';

/** 將 PocketBase 回傳的 role 字串安全映射為 UserRole（避免 admin 顯示成 operator） */
function normalizeUserRole(raw: unknown): UserRole {
  const s = String(raw ?? '').trim();
  if (s === UserRole.ADMIN || /^admin$/i.test(s) || s === 'MOC_ADMIN') return UserRole.ADMIN;
  if (s === UserRole.COACH || /^coach$/i.test(s)) return UserRole.COACH;
  if (s === UserRole.OPERATOR || /^operator$/i.test(s) || /^unit_operator$/i.test(s)) return UserRole.OPERATOR;
  return UserRole.OPERATOR;
}

const App: React.FC = () => {
  // 核心：直接與 PocketBase 同步狀態
  const [currentUser, setCurrentUser] = useState<User | null>(pb.authStore.model as unknown as User);
  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [editMode, setEditMode] = useState<'NONE' | 'BASIC' | 'CONTROL'>('NONE');
  const [projects, setProjects] = useState<Project[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [coachingRecords, setCoachingRecords] = useState<CoachingRecord[]>([]);
  const [reports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const safeNumber = (value: unknown) => Number(value) || 0;

  useEffect(() => {
    // 監聽登入/登出狀態變化
    const unsubscribe = pb.authStore.onChange(() => {
      setIsLoggedIn(pb.authStore.isValid);
      setCurrentUser(pb.authStore.model as unknown as User);
    });

    // 只有在登入狀態下才執行資料抓取（不 fetch 不存在的 collection，避免 404 干擾）
    if (isLoggedIn) {
      const fetchProjects = async () => {
        try {
          const list = await pb.collection('projects').getFullList<Project>({ sort: '-created' });
          setProjects(list);
          if (typeof window !== 'undefined') console.log('[角色驗證] fetchProjects() 回傳 list.length =', list.length);
        } catch (error: unknown) {
          const err = error as { status?: number };
          if (err?.status === 404) console.warn('projects 集合不存在，使用空列表');
          else console.error('Failed to load projects from PocketBase:', error);
          setProjects([]);
        }
      };
      const fetchMonthlyReports = async () => {
        try {
          const list = await pb.collection('monthly_reports').getFullList<MonthlyReport>({ sort: '-created' });
          setMonthlyReports(list);
        } catch (error: unknown) {
          const err = error as { status?: number };
          if (err?.status === 404) console.warn('monthly_reports 集合不存在，使用空列表');
          else console.warn('monthly_reports 載入失敗:', error);
          setMonthlyReports([]);
        }
      };
      const fetchUsers = async () => {
        try {
          const list = await pb.collection('users').getFullList<User>({ sort: '-created' });
          setUsers(list);
        } catch (error: unknown) {
          const err = error as { status?: number };
          if (err?.status === 404) console.warn('users 集合不存在或無權限，使用空列表');
          else console.warn('users 載入失敗:', error);
          setUsers([]);
        }
      };
      fetchProjects();
      fetchMonthlyReports();
      if (normalizeUserRole((pb.authStore.model as Record<string, unknown>)?.role) === UserRole.ADMIN) {
        fetchUsers();
      }
    }

    return () => unsubscribe();
  }, [isLoggedIn]);

  // 登出：清除 authStore，狀態會透過 onChange 自動同步
  const handleLogout = () => {
    pb.authStore.clear();
  };

  if (!isLoggedIn) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }
  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }

  const normalizedRole =
    currentUser?.email === 'finaladmin@moc.gov.tw'
      ? UserRole.ADMIN
      : normalizeUserRole(currentUser?.role);

  const isAdmin = normalizedRole === UserRole.ADMIN;

  // 直接從 authStore.model 讀取 PocketBase 欄位 assigned_projects，不依賴 currentUser 映射
  const authAssignedProjects: string[] = Array.isArray(
    (pb.authStore.model as Record<string, unknown>)?.assigned_projects
  )
    ? ((pb.authStore.model as Record<string, unknown>).assigned_projects as string[])
    : [];

  // operator / coach 只看 authAssignedProjects；admin 看全部；其餘空
  const visibleProjects = isAdmin
    ? projects
    : normalizedRole === UserRole.OPERATOR
      ? projects.filter(project => authAssignedProjects.includes(project.id))
      : normalizedRole === UserRole.COACH
        ? projects.filter(project => authAssignedProjects.includes(project.id))
        : [];

  if (typeof window !== 'undefined') {
    console.log('[管考] currentUser.role 原始值:', currentUser.role, '→ 正規化後:', normalizedRole);
    console.log('[角色驗證] authAssignedProjects =', authAssignedProjects);
    console.log('[角色驗證] projects ids =', projects.map(p => p.id));
    console.log('[角色驗證] visibleProjects.length =', visibleProjects.length);
  }

  // 依 PocketBase projects schema 組 payload（只送 schema 有定義的欄位，避免 validation 失敗）
  const buildProjectPayload = (raw: Project | Partial<Project>, isCreate: boolean) => {
    const budget = (raw.budgetItems || []).reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const payload: Record<string, unknown> = {
      name: raw.name ?? '',
      projectCode: raw.projectCode ?? '',
      unitId: raw.unitId ?? '',
      unitName: raw.unitName ?? raw.executingUnit ?? '',
      executingUnit: raw.executingUnit ?? raw.unitName ?? '',
      year: raw.year ?? '',
      period: raw.period ?? '',
      category: (raw.category && ['原鄉文化行動', '都市文化行動'].includes(String(raw.category))) ? raw.category : '原鄉文化行動',
      representative: raw.representative ?? { name: '', title: '', phone: '', mobile: '', email: '' },
      liaison: raw.liaison ?? { name: '', title: '', phone: '', mobile: '', email: '' },
      commissioner: raw.commissioner ?? { name: '', title: '', phone: '', mobile: '', email: '' },
      chiefStaff: raw.chiefStaff ?? { name: '', title: '', phone: '', mobile: '', email: '' },
      legalAddress: raw.legalAddress ?? '',
      contactAddress: raw.contactAddress ?? '',
      siteTypes: Array.isArray(raw.siteTypes) ? raw.siteTypes : (raw.siteTypes ? [raw.siteTypes] : []),
      sites: Array.isArray(raw.sites) ? raw.sites : (raw.sites ? [raw.sites] : []),
      appliedAmount: Number(raw.appliedAmount) || 0,
      approvedAmount: Number(raw.approvedAmount) || 0,
      status: raw.status ?? '規劃中',
      progress: Number(raw.progress) || 0,
      village: raw.village ?? '',
      startDate: raw.startDate ?? '',
      endDate: raw.endDate ?? '',
      description: raw.description ?? '',
      spent: Number(raw.spent) || 0,
      budget,
      visions: raw.visions ?? [],
      budgetItems: raw.budgetItems ?? [],
      grants: raw.grants ?? [],
      assignedCoaches: raw.assignedCoaches ?? [],
      assignedOperators: raw.assignedOperators ?? [],
    };
    return payload;
  };

  // 儲存/更新計畫（同步 PocketBase，budget = budgetItems 加總，金額防呆 Number()||0）
  const handleUpdateProject = async (updated: Project | Partial<Project>) => {
    const isUpdate = !!(updated.id && projects.some(p => p.id === updated.id));
    const payload = buildProjectPayload(updated, !isUpdate);
    try {
      if (isUpdate) {
        await pb.collection('projects').update(updated.id!, payload);
        setProjects(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated, ...payload } as Project : p)));
      } else {
        delete (payload as Record<string, unknown>).id;
        const created = await pb.collection('projects').create(payload);
        const newProject = created as unknown as Project;
        setProjects(prev => [...prev, newProject]);
      }
      toast.success('計畫已儲存');
    } catch (error: unknown) {
      const err = error as { status?: number; data?: { message?: string; data?: Record<string, { message?: string }> }; message?: string };
      console.error('計畫儲存失敗 — 完整錯誤:', {
        error,
        status: err?.status,
        data: err?.data,
        message: err?.message,
        payload,
      });
      const msg = err?.data?.message || err?.message;
      const details = err?.data?.data;
      if (err?.status === 400 && (msg || details)) {
        const fieldErrors = details ? Object.entries(details).map(([k, v]) => `${k}: ${v?.message || ''}`).filter(Boolean).join('；') : '';
        toast.error(fieldErrors ? `欄位驗證失敗：${fieldErrors}` : (msg || '欄位驗證失敗'));
      } else {
        toast.error(msg && typeof msg === 'string' ? msg : '儲存失敗，請檢查網路連線或主控台錯誤');
      }
    }
  };

  const recalcProjectSpent = async (
    projectId: string,
    sourceReports?: MonthlyReport[]
  ) => {
    const reportsToUse = sourceReports ?? monthlyReports;

    const totalSpent = reportsToUse
      .filter(mr => mr.projectId === projectId)
      .flatMap(mr => mr.expenditures || [])
      .reduce((sum, exp) => sum + safeNumber(exp?.amount), 0);

    await pb.collection('projects').update(projectId, { spent: totalSpent });

    setProjects(prev =>
      prev.map(project =>
        project.id === projectId
          ? { ...project, spent: totalSpent }
          : project
      )
    );

    return totalSpent;
  };

  const handleSaveMonthlyReport = async (report: MonthlyReport) => {
    const payload = {
      projectId: report.projectId,
      month: report.month ?? '',
      workItems: report.workItems ?? [],
      expenditures: (report.expenditures || []).map(exp => ({
        ...exp,
        amount: safeNumber(exp?.amount),
      })),
      summary: report.summary ?? '',
      submittedAt: new Date().toISOString(),
      progress: safeNumber(report.progress),
      isDraft: report.isDraft ?? false,
      fanpageLinks: report.fanpageLinks ?? [],
    };
    try {
      let record: MonthlyReport;

      if (report.id) {
        await pb.collection('monthly_reports').update(report.id, payload);
        record = { ...report, ...payload };
      } else {
        const created = await pb.collection('monthly_reports').create(payload);
        record = created as unknown as MonthlyReport;
      }

      const nextReports = report.id
        ? monthlyReports.map(r => (r.id === report.id ? record : r))
        : [...monthlyReports, record];

      setMonthlyReports(nextReports);

      if (report.projectId) {
        const totalSpent = nextReports
          .filter(mr => mr.projectId === report.projectId)
          .flatMap(mr => mr.expenditures || [])
          .reduce((sum, exp) => sum + safeNumber(exp?.amount), 0);

        const projectUpdate: { spent: number; progress?: number } = {
          spent: totalSpent,
        };

        if (!Number.isNaN(safeNumber(report.progress))) {
          projectUpdate.progress = safeNumber(report.progress);
        }

        await pb.collection('projects').update(report.projectId, projectUpdate);

        setProjects(prev =>
          prev.map(project =>
            project.id === report.projectId
              ? {
                  ...project,
                  spent: totalSpent,
                  ...(report.progress != null
                    ? { progress: safeNumber(report.progress) }
                    : {}),
                }
              : project
          )
        );
      }

      setEditMode('NONE');
      setSelectedReport(null);
      setActiveTab('reports');
      toast.success('月報已成功提交並更新預算進度！');
    } catch (error: unknown) {
      const err = error as { status?: number; data?: { message?: string; data?: Record<string, { message?: string }> }; message?: string };
      console.error('月報存檔失敗 — 完整錯誤:', {
        error,
        status: err?.status,
        data: err?.data,
        message: err?.message,
        payload,
      });
      const msg = err?.data?.message || err?.message;
      const details = err?.data?.data;
      if (err?.status === 400 && (msg || details)) {
        const fieldErrors = details ? Object.entries(details).map(([k, v]) => `${k}: ${v?.message || ''}`).filter(Boolean).join('；') : '';
        toast.error(fieldErrors ? `欄位驗證失敗：${fieldErrors}` : (msg || '欄位驗證失敗'));
      } else {
        toast.error(msg && typeof msg === 'string' ? msg : '存檔失敗，請檢查網路連線或主控台錯誤');
      }
    }
  };

  const handleSaveCoachingRecord = (record: CoachingRecord) => {
    setCoachingRecords(prev => {
      const exists = prev.find(r => r.id === record.id);
      if (exists) return prev.map(r => r.id === record.id ? record : r);
      return [...prev, record];
    });
  };

  // 刪除輔導紀錄
  const handleDeleteCoachingRecord = (recordId: string) => {
    setCoachingRecords(prev => prev.filter(r => r.id !== recordId));
  };

  // 刪除月報
  const handleDeleteMonthlyReport = async (reportId: string) => {
    if (!window.confirm('確定要刪除這份月報嗎？')) return;

    try {
      const targetReport = monthlyReports.find(r => r.id === reportId);
      if (!targetReport) return;

      await pb.collection('monthly_reports').delete(reportId);

      const nextReports = monthlyReports.filter(r => r.id !== reportId);
      setMonthlyReports(nextReports);

      if (targetReport.projectId) {
        const totalSpent = nextReports
          .filter(mr => mr.projectId === targetReport.projectId)
          .flatMap(mr => mr.expenditures || [])
          .reduce((sum, exp) => sum + safeNumber(exp?.amount), 0);

        await pb.collection('projects').update(targetReport.projectId, {
          spent: totalSpent,
        });

        setProjects(prev =>
          prev.map(project =>
            project.id === targetReport.projectId
              ? { ...project, spent: totalSpent }
              : project
          )
        );
      }

      toast.success('月報已刪除並重新計算支出');
    } catch (error) {
      console.error('刪除月報失敗:', error);
      toast.error('刪除失敗');
    }
  };

  // 刪除計畫
  const handleDeleteProject = (projectId: string) => {
    if (!window.confirm('確定要刪除這個計畫嗎？相關的月報和輔導紀錄也會一併刪除。')) return;
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setMonthlyReports(prev => prev.filter(r => r.projectId !== projectId));
    setCoachingRecords(prev => prev.filter(r => r.projectId !== projectId));
  };

  // 處理跨系統資料匯入
  const handleImportData = (importedData: any) => {
    if (importedData.projects) setProjects(importedData.projects);
    if (importedData.monthlyReports) setMonthlyReports(importedData.monthlyReports);
    if (importedData.coachingRecords) setCoachingRecords(importedData.coachingRecords);
    setActiveTab('dashboard');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster
        position="top-right"
        toastOptions={{
          success: { duration: 4000, style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' } },
        }}
      />
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedProject(null);
        setSelectedReport(null);
        setEditMode('NONE');
      }} userRole={normalizedRole} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <UserCircle size={20} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {isAdmin ? 'System Admin / 管理員' : normalizedRole === UserRole.COACH ? '輔導老師' : 'Unit Operator'}
                </span>
                <span className="text-sm font-black text-slate-700 leading-none">
                  {currentUser.email}
                </span>
              </div>
            </div>
            {isAdmin && (
               <button 
                onClick={() => setActiveTab('migration')}
                className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-all"
               >
                 資料遷移中心
               </button>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-sm transition-all group shadow-sm">
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" /> 登出系統
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {/* 資料遷移分頁 */}
          {activeTab === 'migration' && (
            <DataMigration 
              projects={projects} 
              monthlyReports={monthlyReports} 
              coachingRecords={coachingRecords} 
              onImport={handleImportData}
              onBack={() => setActiveTab('dashboard')}
            />
          )}

          {/* 編輯模式：計畫資料/預算 */}
          {editMode === 'BASIC' && selectedProject ? (
            <ProjectForm 
              project={selectedProject} 
              onBack={() => setEditMode('NONE')} 
              onSave={(data) => {
                handleUpdateProject({ ...selectedProject, ...data } as Project);
                setEditMode('NONE');
                setSelectedProject(null);
              }}
              currentUserRole={normalizedRole}
            />
          ) : 
          
          /* 編輯模式：月報/支出/進度 */
          editMode === 'CONTROL' ? (
            <ProjectExecutionControl 
              projects={visibleProjects} 
              coachingRecords={coachingRecords}
              selectedProjectId={selectedProject?.id} 
              initialReport={selectedReport}
              allReports={monthlyReports}
              userRole={normalizedRole}
              assignedProjectIds={authAssignedProjects}
              onBack={() => { setEditMode('NONE'); setSelectedReport(null); }} 
              onSaveReport={handleSaveMonthlyReport} 
            />
          ) : 
          
          /* 計畫詳情檢視 */
          selectedProject ? (
            <div className="space-y-6">
              <ProjectDetail project={selectedProject} reports={reports} onBack={() => setSelectedProject(null)} />
              <div className="flex gap-4 max-w-5xl mx-auto">
                {isAdmin && (
                  <button onClick={() => setEditMode('BASIC')} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-700 font-black rounded-[32px] hover:bg-slate-50 transition-all flex flex-col items-center gap-2 shadow-sm">
                    <Target size={24} /> 編輯計畫細節與預算
                  </button>
                )}
                {(isAdmin || normalizedRole === UserRole.OPERATOR) && (
                  <button onClick={() => setEditMode('CONTROL')} className="flex-1 py-5 bg-[#2D3E50] text-white font-black rounded-[32px] hover:bg-slate-700 transition-all shadow-xl flex flex-col items-center gap-2">
                    <TrendingUp size={24} /> 填寫本月執行管控表
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  projects={visibleProjects}
                  monthlyReports={monthlyReports}
                  onSelectProject={setSelectedProject}
                  onViewAllProjects={() => setActiveTab('projects')}
                />
              )}
              {activeTab === 'projects' && (
                <ProjectList 
                  projects={visibleProjects} 
                  onSelectProject={setSelectedProject} 
                  onAddNew={() => setActiveTab('submission')}
                  onDeleteProject={handleDeleteProject}
                  userRole={normalizedRole}
                />
              )}
              {activeTab === 'reports' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="flex justify-between items-center">
                     <div className="space-y-1">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">月報填報管理</h2>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Progress & Expenditure Reports</p>
                     </div>
                     <button onClick={() => { setEditMode('CONTROL'); setSelectedReport(null); }} className="bg-[#2D3E50] text-white px-8 py-3.5 rounded-2xl font-black shadow-xl hover:bg-slate-700 transition-all flex items-center gap-2">
                        <Plus size={20} /> 新增填報
                     </button>
                   </div>
                   {/* 月報列表表格 ... */}
                   <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                     <table className="w-full text-left">
                       <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                         <tr>
                           <th className="px-10 py-6">序號</th>
                           <th className="px-10 py-6">計畫案</th>
                           <th className="px-10 py-6">填報月份</th>
                           <th className="px-10 py-6">核銷金額</th>
                           <th className="px-10 py-6 text-center">操作</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {monthlyReports.filter(mr => visibleProjects.some(p => p.id === mr.projectId) && mr.isDraft !== true).map(mr => {
                           const proj = projects.find(p => p.id === mr.projectId);
                          const totalSpent = (mr.expenditures || []).reduce(
                            (acc, e) => acc + safeNumber(e?.amount),
                            0
                          );
                           return (
                             <tr key={mr.id} className="hover:bg-slate-50 transition-colors group">
                               <td className="px-10 py-6 font-black text-slate-300 group-hover:text-slate-500 transition-colors">{mr.id}</td>
                               <td className="px-10 py-6 font-black text-slate-800">{proj?.name}</td>
                               <td className="px-10 py-6 text-sm font-black text-blue-600">
                                  <span className="bg-blue-50 px-3 py-1 rounded-lg">{mr.month}</span>
                               </td>
                               <td className="px-10 py-6 text-sm font-black text-emerald-600">${safeNumber(totalSpent).toLocaleString()}</td>
                               <td className="px-10 py-6 text-center flex justify-center gap-2">
                                 <button 
                                    onClick={() => {
                                      setSelectedProject(proj!);
                                      setSelectedReport(mr);
                                      setEditMode('CONTROL');
                                    }}
                                    className="p-3 text-slate-400 hover:bg-white hover:text-blue-500 hover:shadow-md rounded-xl transition-all"
                                 >
                                   <Pencil size={20} />
                                 </button>
                                 <button 
                                    onClick={() => handleDeleteMonthlyReport(mr.id!)}
                                    className="p-3 text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-md rounded-xl transition-all"
                                 >
                                   <Trash2 size={20} />
                                 </button>
                               </td>
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}
              {activeTab === 'grants' && <GrantProgress projects={visibleProjects} onUpdateProject={handleUpdateProject} currentUserRole={normalizedRole} />}
              {activeTab === 'coaching' && <CoachingRecords projects={visibleProjects} coachingRecords={coachingRecords} onSaveRecord={handleSaveCoachingRecord} onDeleteRecord={handleDeleteCoachingRecord} currentUserRole={normalizedRole} currentUserUnitId={currentUser.unitId} />}
              {activeTab === 'finalReport' && <CoachingFinalReport projects={visibleProjects} coachingRecords={coachingRecords} currentUserRole={normalizedRole} />}
              {activeTab === 'download' && <DownloadCenter />}
              {/* 新案提案申請：儲存為新計畫 */}
              {activeTab === 'submission' && isAdmin && (
                <ProjectForm 
                  onBack={() => setActiveTab('projects')} 
                  onSave={(data) => {
                    const newProject = {
                      ...data,
                      status: ProjectStatus.PLANNING,
                      progress: 0,
                      spent: 0,
                      coachingRecords: [],
                      grants: []
                    } as Project;
                    handleUpdateProject(newProject);
                    setActiveTab('projects');
                  }}
                  currentUserRole={normalizedRole}
                />
              )}
              {activeTab === 'accounts' && isAdmin && (
                <AccountManagement currentUser={currentUser} projects={projects} />
              )}
              {activeTab === 'permissions' && isAdmin && (
                <PermissionManagement
                  users={users}
                  projects={projects}
                  onUsersChange={setUsers}
                  onBack={() => setActiveTab('dashboard')}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
