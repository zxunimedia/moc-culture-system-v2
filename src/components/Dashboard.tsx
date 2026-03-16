import React, { useState, useEffect } from 'react';
import { pb } from '../pocketbase';
import { Project, ProjectStatus } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart3,
  ChartPie,
  ExternalLink,
} from 'lucide-react';
import type { MonthlyReport } from '../types';

interface DashboardProps {
  /** 可選：由父層傳入的計畫（不傳則儀表板自行從 PocketBase 抓取） */
  projects?: Project[];
  /** 可選：月報列表，用於顯示「最後月報」欄位 */
  monthlyReports?: MonthlyReport[];
  /** 點擊計畫操作鈕時，跳轉至該計畫細節 */
  onSelectProject?: (project: Project) => void;
  /** 點擊「查看全部計畫」時呼叫（例如切換至計畫管理分頁） */
  onViewAllProjects?: () => void;
}

interface DashboardData {
  projects: Project[];
  loading: boolean;
  stats: {
    total: number;
    active: number;
    alert: number;
    budgetRate: number;
    budgetTotal: number;
    spentTotal: number;
    planning: number;
    completed: number;
  };
}

/** 狀態燈號：ONGOING 綠、STALLED 紅、PLANNING 橘，其餘琥珀 */
function getStatusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.ONGOING:
      return 'bg-emerald-100 text-emerald-700';
    case ProjectStatus.STALLED:
      return 'bg-red-100 text-red-700';
    case ProjectStatus.PLANNING:
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

const AdminDashboard: React.FC<DashboardProps> = ({
  projects: propsProjects,
  monthlyReports = [],
  onSelectProject,
  onViewAllProjects,
}) => {
  const [data, setData] = useState<DashboardData>({
    projects: [],
    loading: true,
    stats: { total: 0, active: 0, alert: 0, budgetRate: 0, budgetTotal: 0, spentTotal: 0, planning: 0, completed: 0 },
  });

  useEffect(() => {
    const applyProjects = (list: Project[]) => {
      const safeList = list ?? [];

      // 1. 總數防護：確保一定是數字，最差也是 0
      const total = safeList.length;

      // 2. 預算執行率防護：所有數值欄位皆用 Number(val)||0，禁止 NaN
      const budgetTotal =
        safeList.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;
      const spentTotal =
        safeList.reduce((sum, p) => sum + (Number(p.spent) || 0), 0) || 0;
      let budgetRate: number;
      if (budgetTotal === 0) {
        budgetRate = 0;
      } else {
        budgetRate = (spentTotal / budgetTotal) * 100;
      }

      // 3. 預警項目：連動 ProjectStatus.STALLED 或 progress > 90
      const active = safeList.filter(
        (p) => p.status === ProjectStatus.ONGOING
      ).length;
      const alertCount = safeList.filter(
        (p) =>
          p.status === ProjectStatus.STALLED ||
          (Number(p.progress) || 0) > 90
      ).length;
      const planning = safeList.filter(
        (p) => p.status === ProjectStatus.PLANNING
      ).length;
      const completed = safeList.filter(
        (p) => p.status === ProjectStatus.COMPLETED
      ).length;

      setData({
        projects: safeList.slice(0, 5),
        loading: false,
        stats: {
          total,
          active,
          alert: alertCount,
          budgetRate,
          budgetTotal,
          spentTotal,
          planning,
          completed,
        },
      });
    };

    if (Array.isArray(propsProjects)) {
      applyProjects(propsProjects);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const records = await pb.collection('projects').getFullList<Project>({
          sort: '-updated',
        });
        applyProjects(records);
      } catch (error) {
        console.error('Dashboard 連動失敗:', error);
        setData((prev) => ({ ...prev, loading: false, projects: [] }));
      }
    };

    fetchDashboardData();
  }, [propsProjects]);

  const projects = propsProjects !== undefined ? propsProjects.slice(0, 5) : data.projects;
  const stats = data.stats;
  const loading = data.loading;

  const statusData = [
    { name: '執行中', value: stats.active, color: '#059669' },
    { name: '進度落後', value: stats.alert, color: '#DC2626' },
    { name: '規劃中', value: stats.planning, color: '#2563EB' },
    { name: '已完成', value: stats.completed, color: '#9CA3AF' },
  ].filter((d) => d.value > 0);

  const budgetData = (propsProjects ?? data.projects).slice(0, 5).map((p) => {
    const budget = Number(p.budget) || 0;
    const spent = Number(p.spent) || 0;
    return {
      name: (p.name || '').substring(0, 10) + (p.name && p.name.length > 10 ? '...' : ''),
      已執行: spent,
      未執行: Math.max(0, budget - spent),
    };
  });

  const getLastReportForProject = (projectId: string): string => {
    const projectReports = monthlyReports
      .filter((mr) => mr.projectId === projectId)
      .sort((a, b) => (b.submittedAt || b.month || '').localeCompare(a.submittedAt || a.month || ''));
    const last = projectReports[0];
    return last ? last.month || last.submittedAt?.slice(0, 7) || '---' : '---';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[320px] bg-slate-50 rounded-2xl">
        <p className="text-slate-500 font-medium">載入儀表板資料中…</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* 1. 核心指標卡片 - 與 projects 連動 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="總計畫數量"
          value={(stats.total || 0).toLocaleString()}
          trend="年度累計"
          icon={<Clock className="text-blue-500" size={22} />}
        />
        <StatCard
          title="執行中計畫"
          value={(stats.active || 0).toLocaleString()}
          sub="進度正常"
          icon={<CheckCircle2 className="text-emerald-500" size={22} />}
          variant="success"
        />
        <StatCard
          title="需特別關注"
          value={(stats.alert || 0).toLocaleString()}
          sub="進度落後／預警"
          color="text-red-600"
          icon={<AlertCircle className="text-red-500" size={22} />}
          variant="danger"
        />
        <StatCard
          title="預算執行率"
          value={`${(stats.budgetRate || 0).toFixed(1)}%`}
          sub={`總額 ${((stats.budgetTotal || 0) / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="text-amber-500" size={22} />}
          variant="warning"
        />
      </div>

      {/* 2. 可操作的計畫列表（單位執行概覽） */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-600 rounded-full" />
            單位執行概覽（前五大計畫）
          </h3>
          {onViewAllProjects && (
            <button
              type="button"
              onClick={onViewAllProjects}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              查看全部計畫
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">計畫名稱</th>
                <th className="px-6 py-4 font-semibold">執行單位</th>
                <th className="px-6 py-4 font-semibold">執行率</th>
                <th className="px-6 py-4 font-semibold">狀態</th>
                <th className="px-6 py-4 font-semibold text-center">最後月報</th>
                <th className="px-6 py-4 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{project.name}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {project.unitName || project.executingUnit || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, Number(project.progress) || 0))}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {(Number(project.progress) || 0).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(project.status)}`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-500 text-sm">
                    {getLastReportForProject(project.id)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {onSelectProject && (
                      <button
                        type="button"
                        onClick={() => onSelectProject(project)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors inline-flex items-center justify-center"
                        title="前往計畫細節"
                      >
                        <ExternalLink size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && (
            <div className="p-10 text-center text-slate-400">目前尚無計畫資料</div>
          )}
        </div>
      </div>

      {/* 3. 圖表區（保留原有視覺） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <BarChart3 size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">單位執行概況（前五大計畫）</h3>
          </div>
          <div className="w-full h-[300px] min-h-[300px]" style={{ minHeight: 300 }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={300}
              initialDimension={{ width: 800, height: 300 }}
            >
              <BarChart data={budgetData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="name" type="category" width={100} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="已執行" stackId="a" fill="#059669" name="已執行" />
                <Bar dataKey="未執行" stackId="a" fill="#E2E8F0" name="未執行" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ChartPie size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">計畫狀態比例</h3>
          </div>
          <div className="w-full h-[300px] min-h-[300px]" style={{ minHeight: 300 }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={300}
              initialDimension={{ width: 800, height: 300 }}
            >
              <PieChart>
                <Pie
                  data={statusData.length > 0 ? statusData : [{ name: '尚無資料', value: 1, color: '#e2e8f0' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(statusData.length > 0 ? statusData : [{ name: '尚無資料', value: 1, color: '#e2e8f0' }]).map(
                    (entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    )
                  )}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

type StatVariant = 'default' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  sub?: string;
  icon: React.ReactNode;
  variant?: StatVariant;
  color?: string;
}

const variantStyles: Record<
  StatVariant,
  { border: string; iconBg: string; iconColor: string }
> = {
  default: { border: 'border-l-slate-500', iconBg: 'bg-slate-50', iconColor: 'text-slate-600' },
  success: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  warning: { border: 'border-l-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  danger: { border: 'border-l-red-500', iconBg: 'bg-red-50', iconColor: 'text-red-600' },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  sub,
  icon,
  variant = 'default',
  color,
}) => {
  const style = variantStyles[variant];
  const valueStr = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 ${style.border} flex flex-col`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${style.iconBg} ${style.iconColor}`}>{icon}</div>
        {trend && (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
            {trend}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h4 className={`text-3xl font-bold tracking-tight tabular-nums ${color || 'text-slate-900'}`}>
          {valueStr}
        </h4>
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
    </div>
  );
};

export default AdminDashboard;
