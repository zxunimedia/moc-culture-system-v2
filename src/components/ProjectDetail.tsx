
import React, { useState, useEffect } from 'react';
import { Project, Report, BudgetCategory } from '../types';
import { analyzeProjectStatus } from '../services/geminiService';
import { ChevronLeft, Calendar, User, Sparkles, MessageSquare, Loader2, Target, DollarSign, Users, MapPin, FileText, Building2 } from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  reports: Report[];
  onBack: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, reports, onBack }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunAnalysis = async () => {
    setLoading(true);
    const result = await analyzeProjectStatus(project, reports);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
          <p className="text-gray-500">{(project.village ?? '') || '—'} | {(project.category ?? '') || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 計畫摘要與進度日誌已移除 */}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              AI 智能管考建議
            </h3>
            {!analysis ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">使用 Gemini AI 分析本計畫的執行成效與潛在風險</p>
                <button 
                  onClick={handleRunAnalysis}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={18} />}
                  開始智能分析
                </button>
              </div>
            ) : (
              <div className="prose prose-sm text-gray-700 max-h-[500px] overflow-y-auto">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <div className="whitespace-pre-wrap">{analysis}</div>
                  <button 
                    onClick={() => setAnalysis(null)}
                    className="mt-4 text-xs text-amber-600 font-bold hover:underline"
                  >
                    重新分析
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">核心數據</h3>
            <div className="space-y-4">
              <DetailStat label="預算執行率" value={`${(Number(project.budget) || 0) > 0 ? (((Number(project.spent) || 0) / (Number(project.budget) || 1)) * 100).toFixed(1) : '0'}%`} />
              <DetailStat label="目前總進度" value={`${Number(project.progress) || 0}%`} />
              <DetailStat label="開始日期" value={project.startDate ?? '—'} />
              <DetailStat label="預計結案" value={project.endDate ?? '—'} />
            </div>
          </div>
        </div>
      </div>

      {/* 計畫基本資料 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Building2 className="text-blue-500" size={20} />
          計畫基本資料
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">計畫編號：</span>
              <span className="font-bold text-gray-800">{project.projectCode || project.id}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">執行單位：</span>
              <span className="font-bold text-gray-800">{(project.executingUnit || project.unitName) || '—'}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">計畫類別：</span>
              <span className="font-bold text-gray-800">{project.category ?? '—'}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">執行期間：</span>
                <span className="font-bold text-gray-800">{(project.period || (project.startDate != null && project.endDate != null ? `${project.startDate} ~ ${project.endDate}` : '')) || '—'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">計畫實施地點：</span>
                <span className="font-bold text-gray-800">{(project.sites || []).filter(Boolean).join('、') || '—'}</span>
              </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">負責人：</span>
              <span className="font-bold text-gray-800">{project.representative?.name} ({project.representative?.title})</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">聯絡人：</span>
              <span className="font-bold text-gray-800">{project.liaison?.name} ({project.liaison?.title})</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">聯絡信箱：</span>
              <span className="font-bold text-gray-800">{project.liaison?.email}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">申請金額：</span>
              <span className="font-bold text-emerald-600">${(Number(project.appliedAmount) || 0).toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">核定金額：</span>
              <span className="font-bold text-emerald-600">${(Number(project.approvedAmount) || 0).toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">輔導老師：</span>
              <span className="font-bold text-gray-800">{project.commissioner?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* OKR 願景與目標 */}
      {project.visions && project.visions.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="text-amber-500" size={20} />
            願景與目標 (OKR)
          </h3>
          <div className="space-y-6">
            {project.visions.map((vision, vIdx) => (
              <div key={vision.id} className="border-l-4 border-amber-400 pl-4">
                <h4 className="font-bold text-gray-800 mb-2">願景 {vIdx + 1}：{vision.title}</h4>
                <p className="text-sm text-gray-600 mb-4">{vision.description}</p>
                <div className="space-y-4 ml-4">
                  {vision.objectives.map((obj, oIdx) => (
                    <div key={obj.id} className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-bold text-gray-700 mb-2">目標 {oIdx + 1}：{obj.title}</h5>
                      <div className="space-y-2">
                        {obj.keyResults.map((kr, kIdx) => (
                          <div key={kr.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0 mb-2 last:mb-0">
                            <div className="flex items-start gap-2 text-sm flex-wrap">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">KR{kIdx + 1}</span>
                              <span className="text-gray-800 font-medium">{kr.description || '—'}</span>
                              <span className="text-gray-400 text-xs">（目標值: {Number(kr.targetValue) || 0}）</span>
                            </div>
                            <div className="mt-1 ml-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600">
                              {kr.expectedDate && <span>預計完成日：{kr.expectedDate}</span>}
                              <span>預算金額：${(Number(kr.budgetAmount) || 0).toLocaleString()}</span>
                              <span>實際執行：${(Number(kr.actualAmount) || 0).toLocaleString()}</span>
                            </div>
                            {kr.outcomeDescription && (
                              <p className="mt-1 ml-4 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">執行成果說明：{kr.outcomeDescription}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 預算明細 */}
      {project.budgetItems && project.budgetItems.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <DollarSign className="text-emerald-500" size={20} />
            預算明細
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-600">類別</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-600">項目名稱</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-600">數量</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-600">單位</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600">單價</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600">總價</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.budgetItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.category === BudgetCategory.PERSONNEL ? 'bg-blue-100 text-blue-700' :
                        item.category === BudgetCategory.OPERATING ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.category === BudgetCategory.PERSONNEL ? '人事費' :
                         item.category === BudgetCategory.OPERATING ? '業務費' : '其他'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.unit}</td>
<td className="px-4 py-3 text-right text-gray-600">${(Number(item.unitPrice) || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">${(Number(item.totalPrice) || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-700">預算總計</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600 text-lg">
                    ${project.budgetItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailStat = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-gray-800 font-bold">{value}</span>
  </div>
);

export default ProjectDetail;
