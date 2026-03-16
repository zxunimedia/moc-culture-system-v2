/**
 * 月報流程優化：卡片順序為
 * 1. 進度填報 (Progress)
 * 2. 支出明細 (Budget/Expenditure)
 * 3. 輔導紀錄回應 (Mentor Feedback)：高亮老師建議（藍/黃底色），落後時紅色警告
 * 精簡：不包含「撥付紀錄核對」功能
 */
import React from 'react';
import { Project, MonthlyReport, CoachingRecord } from '../types';
import { TrendingUp, DollarSign, MessageSquare, AlertTriangle } from 'lucide-react';

export interface MonthlyReportGridProps {
  project: Project;
  report: Partial<MonthlyReport>;
  coachingRecords: CoachingRecord[];
  onUpdateReport?: (patch: Partial<MonthlyReport>) => void;
  /** 單位對單一輔導紀錄的回應（recordId, 回應內容） */
  onMentorFeedbackResponse?: (recordId: string, feedback: string) => void;
  /** 依 recordId 儲存的單位回應（由父層管理） */
  feedbackByRecordId?: Record<string, string>;
  readOnly?: boolean;
  /** 渲染進度區塊內容（由父層傳入表單或自訂 UI） */
  renderProgress?: () => React.ReactNode;
  /** 渲染支出區塊內容 */
  renderExpenditure?: () => React.ReactNode;
  /** 渲染成果說明 */
  renderSummary?: () => React.ReactNode;
}

const MonthlyReportGrid: React.FC<MonthlyReportGridProps> = ({
  project,
  report,
  coachingRecords,
  onUpdateReport,
  onMentorFeedbackResponse,
  feedbackByRecordId = {},
  readOnly = false,
  renderProgress,
  renderExpenditure,
  renderSummary,
}) => {
  const projectRecords = coachingRecords.filter((r) => r.projectId === project.id);
  const hasDelayed = projectRecords.some(
    (r) => r.progressStatus === '嚴重落後' || r.progressStatus === '稍微落後'
  );

  return (
    <div className="space-y-6">
      {/* 1. 進度填報 (Progress) */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
            <TrendingUp size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-800">進度填報</h2>
        </div>
        {renderProgress ? renderProgress() : (
          <div className="text-slate-500 text-sm py-4">請由父層提供 renderProgress 內容</div>
        )}
      </section>

      {/* 2. 支出明細 (Budget/Expenditure) */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
            <DollarSign size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-800">支出明細</h2>
        </div>
        {renderExpenditure ? renderExpenditure() : (
          <div className="text-slate-500 text-sm py-4">請由父層提供 renderExpenditure 內容</div>
        )}
      </section>

      {/* 3. 輔導紀錄回應 (Mentor Feedback)：高亮老師建議，落後時紅色警告 */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
            <MessageSquare size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-800">輔導紀錄回應</h2>
          {hasDelayed && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black">
              <AlertTriangle size={14} /> 老師勾選進度落後
            </span>
          )}
        </div>

        {projectRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">尚無輔導紀錄，無需回應</div>
        ) : (
          <div className="space-y-4">
            {projectRecords.map((rec) => {
              const isDelayed =
                rec.progressStatus === '嚴重落後' || rec.progressStatus === '稍微落後';
              const cardBg = isDelayed
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50/50 border-blue-100';
              return (
                <div
                  key={rec.id}
                  className={`rounded-xl border p-4 ${cardBg}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black text-slate-700">
                      {rec.date} · 第 {rec.frequency} 次訪視
                    </span>
                    {isDelayed && (
                      <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs font-bold">
                        進度落後
                      </span>
                    )}
                  </div>
                  {/* 老師建議區塊：一般為藍/黃底色，落後為紅底 */}
                  {rec.coachObservation?.teamSuggestion && (
                    <div className="mb-3">
                      <p className="text-xs font-black text-slate-500 mb-1">老師建議（含引介資源）</p>
                      <div
                        className={`p-3 rounded-lg text-sm font-medium ${
                          isDelayed ? 'bg-red-100/80 text-red-900 border border-red-200' : 'bg-amber-50 text-slate-800 border border-amber-200'
                        }`}
                      >
                        {rec.coachObservation.teamSuggestion}
                      </div>
                    </div>
                  )}
                  {rec.keyPoints && (
                    <div className="mb-2">
                      <p className="text-xs font-black text-slate-500 mb-1">整體訪視重點</p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {rec.keyPoints}
                      </p>
                    </div>
                  )}
                  {/* 單位回應 */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-black text-slate-500 mb-1">單位回應</p>
                    {readOnly ? (
                      <p className="text-sm text-slate-700 bg-white p-2 rounded-lg border border-slate-100 min-h-[60px]">
                        {rec.operatorFeedback || feedbackByRecordId[rec.id] || '—'}
                      </p>
                    ) : (
                      <textarea
                        className="w-full text-sm border border-slate-200 rounded-lg p-3 min-h-[80px] outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-slate-700"
                        placeholder="請填寫對此次輔導紀錄的意見回應..."
                        value={feedbackByRecordId[rec.id] ?? rec.operatorFeedback ?? ''}
                        onChange={(e) => onMentorFeedbackResponse?.(rec.id, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 成果說明（可選，與原流程一致） */}
      {renderSummary && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 mb-4">成果說明</h2>
          {renderSummary()}
        </section>
      )}
    </div>
  );
};

export default MonthlyReportGrid;
