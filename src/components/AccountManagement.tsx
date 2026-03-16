import React, { useState } from 'react';
import { User, UserRole, Project } from '../types';
import { Users, Trash2, Search, Shield, UserCircle, AlertTriangle, CheckCircle, X, Plus, FolderOpen, Link2 } from 'lucide-react';

interface AccountManagementProps {
  currentUser: User;
  projects: Project[];
  onUpdateProjectAssignment?: (projectId: string, userId: string) => void;
}

interface MockUser {
  id: string;
  email: string;
  role: UserRole;
  unitName: string;
  createdAt: string;
  lastLogin: string;
  assignedProjectIds: string[];
}

const AccountManagement: React.FC<AccountManagementProps> = ({ currentUser, projects, onUpdateProjectAssignment }) => {
  const [users, setUsers] = useState<MockUser[]>([
    { id: '1', email: 'mag@atipd.tw', role: UserRole.ADMIN, unitName: '文化部', createdAt: '2025-01-01', lastLogin: '2026-02-01', assignedProjectIds: [] },
    { id: '2', email: 'wang@atipd.tw', role: UserRole.OPERATOR, unitName: '拔馬部落文化發展協會', createdAt: '2025-06-15', lastLogin: '2026-01-28', assignedProjectIds: ['P001'] },
    { id: '3', email: 'test@example.com', role: UserRole.OPERATOR, unitName: '測試單位', createdAt: '2025-12-01', lastLogin: '2026-01-15', assignedProjectIds: [] },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ email: '', unitName: '', role: UserRole.OPERATOR });

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.unitName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setDeleteConfirm(null);
  };

  const handleAddUser = () => {
    if (!newUser.email || !newUser.unitName) return;
    const newId = `user-${Date.now()}`;
    setUsers(prev => [...prev, {
      id: newId,
      email: newUser.email,
      role: newUser.role,
      unitName: newUser.unitName,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: '-',
      assignedProjectIds: []
    }]);
    setNewUser({ email: '', unitName: '', role: UserRole.OPERATOR });
    setShowAddModal(false);
  };

  const handleAssignProject = (userId: string, projectId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const isAssigned = u.assignedProjectIds.includes(projectId);
        return {
          ...u,
          assignedProjectIds: isAssigned 
            ? u.assignedProjectIds.filter(id => id !== projectId)
            : [...u.assignedProjectIds, projectId]
        };
      }
      return u;
    }));
    if (onUpdateProjectAssignment) {
      onUpdateProjectAssignment(projectId, userId);
    }
  };

  const getAssignedProjectNames = (projectIds: string[]) => {
    return projectIds.map(id => projects.find(p => p.id === id)?.name || id).join(', ');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl">
              <Users size={28} />
            </div>
            帳號管理
          </h2>
          <p className="text-slate-400 font-bold text-sm">管理系統使用者帳號與權限，並指派計畫</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="搜尋帳號或單位..."
              className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Plus size={18} /> 新增帳號
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-5 text-left">帳號</th>
              <th className="px-6 py-5 text-left">所屬單位</th>
              <th className="px-6 py-5 text-center">角色</th>
              <th className="px-6 py-5 text-left">指派計畫</th>
              <th className="px-6 py-5 text-center">最後登入</th>
              <th className="px-6 py-5 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${user.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      {user.role === UserRole.ADMIN ? <Shield size={18} /> : <UserCircle size={18} />}
                    </div>
                    <span className="font-black text-slate-800">{user.email}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-bold text-slate-600">{user.unitName}</td>
                <td className="px-6 py-5 text-center">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                    user.role === UserRole.ADMIN 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === UserRole.ADMIN ? '系統管理員' : '執行單位'}
                  </span>
                </td>
                <td className="px-6 py-5">
                  {user.role === UserRole.ADMIN ? (
                    <span className="text-xs font-bold text-slate-300">管理員可存取所有計畫</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      {user.assignedProjectIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.assignedProjectIds.slice(0, 2).map(pid => {
                            const project = projects.find(p => p.id === pid);
                            return (
                              <span key={pid} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold truncate max-w-[120px]">
                                {project?.name || pid}
                              </span>
                            );
                          })}
                          {user.assignedProjectIds.length > 2 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">
                              +{user.assignedProjectIds.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">尚未指派</span>
                      )}
                      <button
                        onClick={() => setShowAssignModal(user.id)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                        title="指派計畫"
                      >
                        <Link2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-5 text-center text-sm font-bold text-slate-400">{user.lastLogin}</td>
                <td className="px-6 py-5 text-center">
                  {user.email !== currentUser.email ? (
                    deleteConfirm === user.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all flex items-center gap-1"
                        >
                          <CheckCircle size={14} /> 確認
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(user.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    )
                  ) : (
                    <span className="text-xs font-bold text-slate-300">目前登入</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
        <AlertTriangle className="text-amber-500 flex-shrink-0" size={24} />
        <div className="space-y-1">
          <p className="font-black text-amber-800">注意事項</p>
          <p className="text-sm font-bold text-amber-700">刪除帳號後，該使用者將無法再登入系統。相關的計畫資料不會被刪除，但將無法再由該帳號存取。</p>
        </div>
      </div>

      {/* 新增帳號 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <Plus size={24} className="text-indigo-600" />
                新增帳號
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">電子郵件</label>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">所屬單位</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="單位名稱"
                  value={newUser.unitName}
                  onChange={(e) => setNewUser({ ...newUser, unitName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">角色權限</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold outline-none cursor-pointer"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.OPERATOR}>執行單位（操作人員）</option>
                  <option value={UserRole.ADMIN}>系統管理員</option>
                </select>
              </div>
              <p className="text-xs font-bold text-slate-400">
                新增帳號後，系統將自動發送密碼至該電子郵件。您可以在帳號列表中指派計畫給該使用者。
              </p>
            </div>
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                disabled={!newUser.email || !newUser.unitName}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle size={18} /> 確認新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 指派計畫 Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <FolderOpen size={24} className="text-emerald-600" />
                指派計畫
              </h3>
              <button onClick={() => setShowAssignModal(null)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm font-bold text-slate-500 mb-4">
                選擇要指派給 <span className="text-indigo-600">{users.find(u => u.id === showAssignModal)?.email}</span> 的計畫：
              </p>
              {projects.map(project => {
                const user = users.find(u => u.id === showAssignModal);
                const isAssigned = user?.assignedProjectIds.includes(project.id);
                return (
                  <div
                    key={project.id}
                    onClick={() => handleAssignProject(showAssignModal, project.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      isAssigned 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-black text-slate-800">{project.name}</p>
                        <p className="text-xs font-bold text-slate-400">{project.executingUnit}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isAssigned 
                          ? 'border-emerald-500 bg-emerald-500 text-white' 
                          : 'border-slate-300'
                      }`}>
                        {isAssigned && <CheckCircle size={14} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 flex justify-end">
              <button
                onClick={() => setShowAssignModal(null)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <CheckCircle size={18} /> 完成指派
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
