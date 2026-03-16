/**
 * 期末結案報告表單（Mentor 專屬）
 * - 第一項：自動聚合年度諮詢紀錄（非實地部分）
 * - 第二項：綜合輔導意見（1,000 字以上檢核，AI 輔助生成正面論述）
 * - 附件：至少 3 張 500 萬畫素以上照片
 */
import React, { useState, useRef } from 'react';
import { Project, CoachingRecord, CoachingFinalReport } from '../types';
import { FileText, Calendar, Camera, Save, X, Sparkles, AlertTriangle } from 'lucide-react';

const MIN_OPINION_LENGTH = 1000;
const MIN_PHOTOS = 3;

export interface FinalReportFormProps {
  project: Project;
  coachingRecords: CoachingRecord[];
  coachId: string;
  onSave: (report: CoachingFinalReport) => void;
  onCancel: () => void;
  onAiSuggest?: (visitSummaries: { date: string; keyPoints: string }[]) => Promise<string>;
}

const FinalReportForm: React.FC<FinalReportFormProps> = ({
  project,
  coachingRecords,
  coachId,
  onSave,
  onCancel,
  onAiSuggest,
}) => {
  const [comprehensiveOpinion, setComprehensiveOpinion] = useState('');
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectRecords = coachingRecords.filter((r) => r.projectId === project.id);
  const visitSummaries = projectRecords.map((r) => ({
    date: r.date,
    keyPoints: r.keyPoints || '',
  }));

  const opinionLength = comprehensiveOpinion.replace(/\s/g, '').length;
  const opinionOk = opinionLength >= MIN_OPINION_LENGTH;
  const photosOk = allPhotos.length >= MIN_PHOTOS;

  const handleAiSuggest = async () => {
    if (!onAiSuggest) {
      setAiError('未設定 AI 服務，請在環境變數設定 API Key。');
      return;
    }
    setLoadingAi(true);
    setAiError('');
    try {
      const suggestion = await onAiSuggest(visitSummaries);
      setComprehensiveOpinion((prev) => (prev ? `${prev}\n\n${suggestion}` : suggestion));
    } catch (e) {
      setAiError('AI 生成失敗，請稍後再試。');
    } finally {
      setLoadingAi(false);
    }
  };

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAllPhotos((prev) => [...prev, dataUrl]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setAllPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!opinionOk || !photosOk) return;
    const report: CoachingFinalReport = {
      id: `fr-${Date.now()}`,
      projectId: project.id,
      coachId,
      visitSummaries,
      comprehensiveOpinion,
      allPhotos,
      createdAt: new Date().toISOString(),
    };
    onSave(report);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FileText size={24} /> 期末結案報告
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {project.name} · 執行單位：{project.executingUnit}
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* 第一項：年度諮詢紀錄摘要（非實地） */}
        <section>
          <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
            <Calendar size={18} /> 一、年度諮詢紀錄摘要
          </h3>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            {visitSummaries.length === 0 ? (
              <p className="text-slate-500 text-sm">尚無訪視/諮詢紀錄</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {visitSummaries.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-black text-slate-600 shrink-0">{s.date}</span>
                    <span className="text-slate-700">{s.keyPoints || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 第二項：綜合輔導意見（1,000 字檢核 + AI 建議） */}
        <section>
          <h3 className="text-sm font-black text-slate-700 mb-3">二、綜合輔導意見</h3>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-xs font-bold ${opinionOk ? 'text-emerald-600' : 'text-amber-600'}`}>
              字數：{opinionLength} / {MIN_OPINION_LENGTH} 字（不含空白）
              {opinionOk ? ' ✓' : '（未達 1,000 字）'}
            </span>
            {onAiSuggest && (
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={loadingAi}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200 disabled:opacity-50"
              >
                <Sparkles size={14} /> {loadingAi ? '生成中…' : 'AI 撰寫建議'}
              </button>
            )}
          </div>
          {aiError && (
            <p className="text-red-600 text-xs font-bold mb-2 flex items-center gap-1">
              <AlertTriangle size={14} /> {aiError}
            </p>
          )}
          <textarea
            className={`w-full min-h-[280px] border rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/20 resize-y ${
              !opinionOk && opinionLength > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
            }`}
            value={comprehensiveOpinion}
            onChange={(e) => setComprehensiveOpinion(e.target.value)}
            placeholder="請撰寫綜合輔導意見，至少 1,000 字（不含空白）。可點「AI 撰寫建議」由 AI 輔助生成正面論述。"
          />
        </section>

        {/* 附件：至少 3 張照片（500 萬畫素以上建議） */}
        <section>
          <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
            <Camera size={18} /> 三、訪視照片彙整
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            至少 {MIN_PHOTOS} 張，建議 500 萬畫素以上
          </p>
          <div className="grid grid-cols-3 gap-4">
            {allPhotos.map((url, i) => (
              <div key={i} className="aspect-video rounded-xl overflow-hidden border border-slate-200 relative group">
                <img src={url} alt={`附件 ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <label className="aspect-video rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all">
              <Camera size={32} className="text-slate-300" />
              <span className="text-xs font-bold text-slate-500 mt-2">新增照片</span>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={addPhoto} />
            </label>
          </div>
          {!photosOk && (
            <p className="text-amber-600 text-xs font-bold mt-2 flex items-center gap-1">
              <AlertTriangle size={14} /> 至少需 {MIN_PHOTOS} 張照片（目前 {allPhotos.length} 張）
            </p>
          )}
        </section>
      </div>

      <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!opinionOk || !photosOk}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={18} /> 儲存結案報告
        </button>
      </div>
    </div>
  );
};

export default FinalReportForm;
