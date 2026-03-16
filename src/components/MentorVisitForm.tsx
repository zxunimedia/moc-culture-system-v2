/**
 * 輔導老師訪視紀錄表（整合版）
 * 填報順序：個別工作項目訪視內容 → 整體訪視重點 → 整體訪視結果
 * 輔導老師視角：隱藏計畫期程、OKR簡表等行政欄位
 * 強制：現場照片至少 4 張；勾選「進度落後」時改進策略為必填
 */
import React, { useState } from 'react';
import { Project, CoachingRecord, KRStatus, VisitRow, AssessmentResult } from '../types';
import { Camera, Save, X, AlertTriangle } from 'lucide-react';

const recordHeader = 'bg-slate-100 border-r border-slate-300 px-4 py-2 text-left text-sm font-black text-slate-700 align-top';
const recordCell = 'border-b border-slate-200 px-4 py-2 text-sm';
const recordInput = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400';

const initAssessment = (): AssessmentResult => ({ status: KRStatus.ON_TRACK, strategy: '' });
const initVisitRow = (id: string, workItem = ''): VisitRow => ({ id, workItem, opinion: '', status: KRStatus.ON_TRACK, strategy: '' });

const KR_OPTIONS = [
  { status: KRStatus.ON_TRACK, text: '符合進度' },
  { status: KRStatus.DELAYED, text: '進度落後' },
  { status: KRStatus.AHEAD, text: '進度超前' },
];

function StatusPicker({
  row,
  onChange,
  disabled,
  required,
}: {
  row: VisitRow;
  onChange: (field: keyof VisitRow, val: string | KRStatus) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-3 text-xs text-left">
      <div className="flex flex-wrap gap-2">
        {KR_OPTIONS.map((s) => (
          <label key={s.status} className={`flex items-center gap-1 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
              type="radio"
              checked={row.status === s.status}
              onChange={() => !disabled && onChange('status', s.status)}
              disabled={disabled}
            />{' '}
            {s.text}
          </label>
        ))}
      </div>
      {row.status === KRStatus.DELAYED && (
        <div className="space-y-1">
          <p className="font-black text-red-500">
            改進策略 {required ? <span className="text-red-600">*必填</span> : ''}
          </p>
          <textarea
            className={`w-full border rounded p-2 outline-none font-bold ${required && !row.strategy?.trim() ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
            value={row.strategy}
            onChange={(e) => !disabled && onChange('strategy', e.target.value)}
            disabled={disabled}
            placeholder="請填寫改進策略..."
          />
        </div>
      )}
    </div>
  );
}

function ResultRow({
  label,
  result,
  onChange,
  disabled,
}: {
  label: string;
  result: AssessmentResult;
  onChange: (r: AssessmentResult) => void;
  disabled?: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className={`${recordHeader} w-1/3`}>{label}</td>
      <td className={recordCell}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-6">
            {KR_OPTIONS.map((opt) => (
              <label key={opt.status} className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  checked={result.status === opt.status}
                  onChange={() => !disabled && onChange({ ...result, status: opt.status })}
                  disabled={disabled}
                />{' '}
                {opt.text}
              </label>
            ))}
          </div>
          {result.status === KRStatus.DELAYED && (
            <div className="bg-red-50 p-2 rounded-lg border border-red-100">
              <p className="font-black text-red-500 text-xs mb-1">改進策略 *必填</p>
              <textarea
                className={`w-full border rounded p-2 text-sm ${!result.strategy?.trim() ? 'border-red-400' : 'border-red-200'}`}
                value={result.strategy}
                onChange={(e) => !disabled && onChange({ ...result, strategy: e.target.value })}
                disabled={disabled}
                placeholder="請填寫改進策略..."
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export interface MentorVisitFormProps {
  project: Project;
  record: Partial<CoachingRecord>;
  onSave: (record: Partial<CoachingRecord>) => void;
  onCancel: () => void;
  canEdit?: boolean;
}

const MentorVisitForm: React.FC<MentorVisitFormProps> = ({ project, record, onSave, onCancel, canEdit = true }) => {
  const [form, setForm] = useState<Partial<CoachingRecord>>(record);
  const [errors, setErrors] = useState<string[]>([]);

  const progressStatusDelayed = form.progressStatus === '嚴重落後' || form.progressStatus === '稍微落後';
  const hasDelayedVisitRow = form.visitContents?.some((r) => r.status === KRStatus.DELAYED && !r.strategy?.trim());
  const hasDelayedResult = [
    form.overallResults?.progress,
    form.overallResults?.content,
    form.overallResults?.records,
    form.overallResults?.vouchers,
  ].some((r) => r?.status === KRStatus.DELAYED && !r?.strategy?.trim());
  const photoCount = form.photos?.length ?? 0;
  const minPhotos = 4;

  const validate = (): boolean => {
    const list: string[] = [];
    if (photoCount < minPhotos) list.push(`現場照片至少需 ${minPhotos} 張，目前 ${photoCount} 張`);
    if (progressStatusDelayed && !form.coachObservation?.teamSuggestion?.trim()) {
      list.push('勾選進度落後時，請填寫「提供團隊建議」改進策略');
    }
    if (hasDelayedVisitRow) list.push('有工作項目勾選「進度落後」時，改進策略為必填');
    if (hasDelayedResult) list.push('整體訪視結果中勾選「進度落後」時，改進策略為必填');
    setErrors(list);
    return list.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  const updateVisitContent = (id: string, field: keyof VisitRow, value: string | KRStatus) => {
    setForm((prev) => ({
      ...prev,
      visitContents: prev.visitContents?.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    }));
  };

  const addPhoto = (index: number, dataUrl: string) => {
    const photos = [...(form.photos || [])];
    photos[index] = dataUrl;
    setForm((prev) => ({ ...prev, photos }));
  };

  const removePhoto = (index: number) => {
    const photos = [...(form.photos || [])];
    photos.splice(index, 1);
    setForm((prev) => ({ ...prev, photos }));
  };

  return (
    <div className="bg-white border-2 border-slate-300 shadow-xl overflow-hidden max-w-4xl mx-auto rounded-xl">
      <table className="w-full border-collapse border-slate-300 text-sm font-bold">
        <tbody>
          <tr>
            <td colSpan={4} className="text-center py-4 bg-white border-b-2 border-slate-300">
              <div className="text-lg font-black text-slate-700">文化部「原住民村落文化發展計畫」</div>
              <div className="text-xl font-black tracking-widest text-slate-700 mt-1">輔導老師訪視紀錄表</div>
              <div className="text-xs text-slate-500 mt-1">受訪單位：{project.executingUnit}　計畫名稱：{project.name}</div>
            </td>
          </tr>

          {/* 一、個別工作項目訪視內容：工作項目、進度描述、進度總結（含改進策略） */}
          <tr>
            <td className={recordHeader}>一、個別工作項目訪視內容</td>
            <td colSpan={3} className={`${recordCell} p-0`}>
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300">
                    <th className="px-4 py-2 border-r border-slate-300 w-1/4">工作項目</th>
                    <th className="px-4 py-2 border-r border-slate-300">進度描述 / 訪視意見</th>
                    <th className="px-4 py-2 w-1/4">進度總結（含改進策略）</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-slate-200">
                  {(form.visitContents || []).map((row, idx) => (
                    <tr key={row.id}>
                      <td className="border-r border-slate-300 p-2">
                        <input
                          type="text"
                          className={`${recordInput} text-center`}
                          value={row.workItem}
                          onChange={(e) => canEdit && updateVisitContent(row.id, 'workItem', e.target.value)}
                          placeholder={`項目 ${idx + 1}`}
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="border-r border-slate-300 p-2">
                        <textarea
                          className={`${recordInput} min-h-[60px]`}
                          value={row.opinion}
                          onChange={(e) => canEdit && updateVisitContent(row.id, 'opinion', e.target.value)}
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="p-2">
                        <StatusPicker
                          row={row}
                          onChange={(f, v) => canEdit && updateVisitContent(row.id, f, v)}
                          disabled={!canEdit}
                          required={row.status === KRStatus.DELAYED}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border-r border-slate-300 p-3 bg-slate-50 font-black">全計畫捲動在地社區/部落參與人數</td>
                    <td className="border-r border-slate-300 p-2">
                      <textarea
                        className={recordInput}
                        value={form.communityMobilization?.opinion}
                        onChange={(e) =>
                          canEdit &&
                          setForm((p) => ({
                            ...p,
                            communityMobilization: { ...p.communityMobilization!, opinion: e.target.value },
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="p-2">
                      <StatusPicker
                        row={form.communityMobilization!}
                        onChange={(f, v) =>
                          canEdit &&
                          setForm((p) => ({
                            ...p,
                            communityMobilization: { ...p.communityMobilization!, [f]: v },
                          }))
                        }
                        disabled={!canEdit}
                        required={form.communityMobilization?.status === KRStatus.DELAYED}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-slate-300 p-3 bg-slate-50 font-black">全計畫串連社群個數</td>
                    <td className="border-r border-slate-300 p-2">
                      <textarea
                        className={recordInput}
                        value={form.communityConnection?.opinion}
                        onChange={(e) =>
                          canEdit &&
                          setForm((p) => ({
                            ...p,
                            communityConnection: { ...p.communityConnection!, opinion: e.target.value },
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="p-2">
                      <StatusPicker
                        row={form.communityConnection!}
                        onChange={(f, v) =>
                          canEdit &&
                          setForm((p) => ({
                            ...p,
                            communityConnection: { ...p.communityConnection!, [f]: v },
                          }))
                        }
                        disabled={!canEdit}
                        required={form.communityConnection?.status === KRStatus.DELAYED}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* 二、整體訪視重點：質性觀察與引介資源 */}
          <tr>
            <td className={recordHeader}>二、整體訪視重點</td>
            <td colSpan={3} className={recordCell}>
              <textarea
                className={`${recordInput} min-h-[100px]`}
                value={form.keyPoints || ''}
                onChange={(e) => canEdit && setForm((p) => ({ ...p, keyPoints: e.target.value }))}
                placeholder="質性觀察與引介資源..."
                disabled={!canEdit}
              />
            </td>
          </tr>

          {/* 三、整體訪視結果：四項勾選 */}
          <tr>
            <td className={recordHeader}>三、整體訪視結果</td>
            <td colSpan={3} className={`${recordCell} p-0`}>
              <table className="w-full border-collapse">
                <tbody className="divide-y border-slate-200">
                  <ResultRow
                    label="1. 計畫執行進度"
                    result={form.overallResults?.progress ?? initAssessment()}
                    onChange={(r) => canEdit && setForm((p) => ({ ...p, overallResults: { ...p.overallResults!, progress: r } }))}
                    disabled={!canEdit}
                  />
                  <ResultRow
                    label="2. 計畫執行內容"
                    result={form.overallResults?.content ?? initAssessment()}
                    onChange={(r) => canEdit && setForm((p) => ({ ...p, overallResults: { ...p.overallResults!, content: r } }))}
                    disabled={!canEdit}
                  />
                  <ResultRow
                    label="3. 紀錄完善度"
                    result={form.overallResults?.records ?? initAssessment()}
                    onChange={(r) => canEdit && setForm((p) => ({ ...p, overallResults: { ...p.overallResults!, records: r } }))}
                    disabled={!canEdit}
                  />
                  <ResultRow
                    label="4. 核銷憑證"
                    result={form.overallResults?.vouchers ?? initAssessment()}
                    onChange={(r) => canEdit && setForm((p) => ({ ...p, overallResults: { ...p.overallResults!, vouchers: r } }))}
                    disabled={!canEdit}
                  />
                </tbody>
              </table>
            </td>
          </tr>

          {/* 進度達成情形（勾選進度落後時改進策略必填） */}
          <tr>
            <td className={recordHeader}>本案進度達成情形</td>
            <td colSpan={3} className={recordCell}>
              <div className="flex gap-6 flex-wrap">
                {(['嚴重落後', '稍微落後', '符合', '超前進度'] as const).map((status) => (
                  <label key={status} className={`flex items-center gap-2 ${!canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      checked={form.progressStatus === status}
                      onChange={() => canEdit && setForm((p) => ({ ...p, progressStatus: status }))}
                      disabled={!canEdit}
                    />
                    <span
                      className={`font-bold ${
                        status === '嚴重落後' ? 'text-red-600' : status === '稍微落後' ? 'text-amber-600' : status === '符合' ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {status}
                    </span>
                  </label>
                ))}
              </div>
              {(form.progressStatus === '嚴重落後' || form.progressStatus === '稍微落後') && (
                <div className="mt-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <p className="font-black text-amber-800 text-xs mb-2">提供團隊建議（改進策略）*必填</p>
                  <textarea
                    className={`w-full border rounded p-2 text-sm ${!form.coachObservation?.teamSuggestion?.trim() ? 'border-red-400' : 'border-amber-200'}`}
                    value={form.coachObservation?.teamSuggestion || ''}
                    onChange={(e) =>
                      canEdit &&
                      setForm((p) => ({
                        ...p,
                        coachObservation: { ...p.coachObservation!, teamSuggestion: e.target.value },
                      }))
                    }
                    disabled={!canEdit}
                    placeholder="含適時引介相關資源..."
                  />
                </div>
              )}
            </td>
          </tr>

          {/* 現場照片（至少 4 張） */}
          <tr>
            <td className={recordHeader}>現場照片</td>
            <td colSpan={3} className={`${recordCell} min-h-[200px]`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-amber-400 transition-all"
                  >
                    {form.photos?.[i] ? (
                      <>
                        <img src={form.photos[i]} className="w-full h-full object-cover" alt={`現場照片 ${i + 1}`} />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      canEdit && (
                        <label className="cursor-pointer flex flex-col items-center gap-2 p-4">
                          <Camera size={28} className="text-slate-300" />
                          <span className="text-xs font-bold text-slate-400">照片 {i + 1}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => addPhoto(i, ev.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )
                    )}
                  </div>
                ))}
              </div>
              {canEdit && (
                <p className={`text-xs font-black mt-2 flex items-center gap-2 ${photoCount < minPhotos ? 'text-red-600' : 'text-amber-600'}`}>
                  <AlertTriangle size={14} /> 至少上傳 {minPhotos} 張照片（目前 {photoCount} 張）
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {errors.length > 0 && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-bold">
          <ul className="list-disc list-inside">
            {errors.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 flex justify-end gap-3 border-t border-slate-200">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
          取消
        </button>
        {canEdit && (
          <button type="button" onClick={handleSave} className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 flex items-center gap-2">
            <Save size={16} /> 儲存
          </button>
        )}
      </div>
    </div>
  );
};

export default MentorVisitForm;
export { initVisitRow, initAssessment };
