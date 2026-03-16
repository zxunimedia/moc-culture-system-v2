import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckCircle,
  MessageSquare,
  FileCheck,
  PlusCircle,
  Settings,
  Shield,
  RefreshCw,
  Download,
  Database,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  reports: FileText,
  coaching: MessageSquare,
  grants: CheckCircle,
  finalReport: FileCheck,
  submission: PlusCircle,
  accounts: Settings,
  permissions: Shield,
  download: Download,
  migration: Database,
};

// 必備：儀表板、計畫管理、月報管理、輔導紀錄、結案報告
// 僅 admin：撥付進度、權限與用戶管理、下載專區、新案提案、資料遷移、帳號設定
// operator：儀表板、計畫管理、月報管理（不可見撥付進度／權限／遷移／新案／帳號設定）
const menuItems: { id: string; label: string; roles: string[] }[] = [
  { id: 'dashboard', label: '儀表板總覽', roles: [UserRole.ADMIN, UserRole.COACH, UserRole.OPERATOR] },
  { id: 'projects', label: '計畫管理', roles: [UserRole.ADMIN, UserRole.COACH, UserRole.OPERATOR] },
  { id: 'reports', label: '月報管理', roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { id: 'grants', label: '撥付進度', roles: [UserRole.ADMIN] },
  { id: 'coaching', label: '輔導紀錄', roles: [UserRole.ADMIN, UserRole.COACH] },
  { id: 'finalReport', label: '結案報告', roles: [UserRole.ADMIN, UserRole.COACH] },
  { id: 'permissions', label: '權限與用戶管理', roles: [UserRole.ADMIN] },
  { id: 'download', label: '下載專區', roles: [UserRole.ADMIN] },
  { id: 'submission', label: '新案提案申請', roles: [UserRole.ADMIN] },
  { id: 'migration', label: '資料遷移', roles: [UserRole.ADMIN] },
  { id: 'accounts', label: '帳號設定', roles: [UserRole.ADMIN] },
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole }) => {
  const visibleMenu = menuItems.filter((item) => userRole && item.roles.includes(userRole));

  const handleForceRefresh = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', Date.now().toString());
    window.location.href = url.toString();
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-700/80">
        <img
          src="/logo.png"
          alt="文化部原村計畫"
          className="w-10 h-10 max-w-[200px] object-contain"
          style={{ maxWidth: '200px', maxHeight: '40px' }}
        />
        <div className="flex flex-col">
          <h1 className="font-black text-lg leading-tight tracking-tighter text-white">文化部原村計畫</h1>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Management System</span>
        </div>
      </div>

      <nav className="flex-1 mt-6 overflow-y-auto px-3">
        {visibleMenu.map((item) => {
          const Icon = iconMap[item.id] || FileText;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group mb-1 ${
                isActive
                  ? 'bg-slate-700 text-white shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <Icon
                size={20}
                className={isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400/80'}
              />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/80 space-y-3">
        <button
          onClick={handleForceRefresh}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all duration-200 border border-slate-700"
        >
          <RefreshCw size={14} /> 強制重新整理
        </button>
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">系統版本</p>
          <p className="text-xs font-semibold text-slate-400">v1.3.5 Stable</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
