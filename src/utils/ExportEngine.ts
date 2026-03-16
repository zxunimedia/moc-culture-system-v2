/**
 * 報表匯出引擎：資料庫數據填入 Word 模板
 * - 模板標籤命名與 types.ts / 資料庫欄位名一致（如 {{date}}、{{name}}、{{comprehensiveOpinion}}）
 * - □ 自動替換為 ☑（勾選項）
 * - 照片自動縮放排版
 * 注意：若需產出真實 .docx 二進位檔，可整合 docxtemplater 或 docx 套件；此模組先以 HTML 模板 + 字串替換實作。
 */

import type { CoachingRecord, CoachingFinalReport, BudgetItem, Project } from '../types';

export type PlaceholderMap = Record<string, string | number | boolean | undefined | null>;

const CHECKED = '☑';
const UNCHECKED = '☐';

/** 將布林或「是/否」字串轉為勾選符號 */
export function toCheckbox(value: boolean | string | undefined | null): string {
  if (value === true || value === '是' || value === 'Y' || value === 'y' || String(value).trim() === '1') {
    return CHECKED;
  }
  return UNCHECKED;
}

/** 替換模板中的 {{key}} 為對應值；key 與資料庫欄位名一致；若值為 boolean 則轉為 ☑/☐ */
export function replacePlaceholders(template: string, data: PlaceholderMap): string {
  let out = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
    const str =
      value === undefined || value === null
        ? ''
        : typeof value === 'boolean'
          ? toCheckbox(value)
          : String(value);
    out = out.replace(placeholder, str);
  }
  return out;
}

/** 將模板中 {{key}} 依條件替換為 ☑/☐：傳入的 key 與欄位名一致 */
export function replaceCheckboxes(
  template: string,
  checkedKeys: Record<string, boolean>
): string {
  let out = template;
  for (const [key, checked] of Object.entries(checkedKeys)) {
    const placeholder = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
    out = out.replace(placeholder, checked ? CHECKED : UNCHECKED);
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 將模板中獨立的 □ 替換為 ☑（以索引對應） */
export function replaceCheckboxesByIndex(
  template: string,
  checkedIndices: number[]
): string {
  const checkboxPattern = /□/g;
  let index = 0;
  return template.replace(checkboxPattern, () => {
    const result = checkedIndices.includes(index) ? CHECKED : UNCHECKED;
    index += 1;
    return result;
  });
}

/** 照片 URL 清單轉為 HTML 片段，可指定最大寬高與每行張數 */
export function photosToHtml(
  urls: string[],
  options: { maxWidth?: number; maxHeight?: number; columns?: number } = {}
): string {
  const { maxWidth = 400, maxHeight = 300, columns = 2 } = options;
  const style = `object-fit: cover; max-width: ${maxWidth}px; max-height: ${maxHeight}px; width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;`;
  const gridStyle = `display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 16px; margin: 16px 0;`;
  const items = urls
    .map((url) => `<img src="${escapeHtml(url)}" alt="照片" style="${style}" />`)
    .join('');
  return `<div style="${gridStyle}">${items}</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 訪視紀錄表：從 CoachingRecord 建立與欄位名一致的 PlaceholderMap
 * 模板標籤與資料庫欄位一致：{{date}}, {{location}}, {{keyPoints}}, {{progressStatus}}, {{serialNumber}}, {{method}}, {{writer}}, {{startTime}}, {{endTime}}, {{operatorFeedback}}
 * 巢狀欄位用點記法：{{coachObservation.executionStatus}}, {{coachObservation.teamSuggestion}}, {{coachObservation.mocSuggestion}}, {{coachAttendees.coach}}, {{coachAttendees.unitStaff}}, {{coachAttendees.otherStaff}}
 */
export function mapVisitRecordToPlaceholders(record: Partial<CoachingRecord>): PlaceholderMap {
  const flat: PlaceholderMap = {
    id: record.id ?? '',
    projectId: record.projectId ?? '',
    serialNumber: record.serialNumber ?? '',
    location: record.location ?? '',
    frequency: record.frequency ?? '',
    method: record.method ?? '',
    writer: record.writer ?? '',
    date: record.date ?? '',
    startTime: record.startTime ?? '',
    endTime: record.endTime ?? '',
    keyPoints: record.keyPoints ?? '',
    progressStatus: record.progressStatus ?? '',
    operatorFeedback: record.operatorFeedback ?? '',
  };
  if (record.coachObservation) {
    flat['coachObservation.executionStatus'] = record.coachObservation.executionStatus ?? '';
    flat['coachObservation.teamSuggestion'] = record.coachObservation.teamSuggestion ?? '';
    flat['coachObservation.mocSuggestion'] = record.coachObservation.mocSuggestion ?? '';
  }
  if (record.coachAttendees) {
    flat['coachAttendees.coach'] = record.coachAttendees.coach ?? '';
    flat['coachAttendees.unitStaff'] = record.coachAttendees.unitStaff ?? '';
    flat['coachAttendees.otherStaff'] = record.coachAttendees.otherStaff ?? '';
  }
  return flat;
}

/**
 * 預算表：從 BudgetItem[] 建立與欄位名一致的資料列
 * 每列模板標籤：{{id}}, {{name}}, {{category}}, {{quantity}}, {{unit}}, {{unitPrice}}, {{totalPrice}}, {{description}}
 */
export function mapBudgetToRows(budgetItems: BudgetItem[]): PlaceholderMap[] {
  return budgetItems.map((item, i) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    description: item.description ?? '',
  }));
}

/**
 * 結案報告：從 CoachingFinalReport 建立與欄位名一致的 PlaceholderMap
 * 模板標籤：{{comprehensiveOpinion}}, {{visitSummaries}}, {{allPhotos}}, {{projectId}}, {{coachId}}, {{createdAt}}
 * visitSummaries 為陣列，輸出為格式化字串供單一 {{visitSummaries}} 使用；allPhotos 為照片 HTML 區塊。
 */
export function mapFinalReportToPlaceholders(report: Partial<CoachingFinalReport>): PlaceholderMap {
  const summaries = report.visitSummaries ?? [];
  const visitSummariesText = summaries
    .map((s) => `【${s.date}】 ${s.keyPoints ?? '—'}`)
    .join('\n');
  const allPhotosHtml =
    report.allPhotos?.length ?
      photosToHtml(report.allPhotos, { maxWidth: 320, maxHeight: 240, columns: 3 })
    : '';
  return {
    id: report.id ?? '',
    projectId: report.projectId ?? '',
    coachId: report.coachId ?? '',
    comprehensiveOpinion: report.comprehensiveOpinion ?? '',
    visitSummaries: visitSummariesText,
    allPhotos: allPhotosHtml,
    createdAt: report.createdAt ?? '',
  };
}

/**
 * 計畫基本資料：與 Project 欄位名一致的扁平化 PlaceholderMap（聯絡人為子物件，以 representative.name 等點記法展開）
 * 模板標籤與資料庫欄位一致：{{name}}, {{projectCode}}, {{unitName}}, {{executingUnit}}, {{year}}, {{period}}, {{category}}, {{appliedAmount}}, {{approvedAmount}}, {{status}}, {{progress}}, {{village}}, {{startDate}}, {{endDate}}, {{description}}, {{spent}}, {{budget}}, {{legalAddress}}, {{contactAddress}}
 * 聯絡人：{{representative.name}}, {{representative.email}}, {{liaison.name}}, {{liaison.email}}, {{commissioner.name}}, {{chiefStaff.name}} 等
 */
export function mapProjectToPlaceholders(project: Partial<Project>): PlaceholderMap {
  const flat: PlaceholderMap = {
    name: project.name ?? '',
    projectCode: project.projectCode ?? '',
    unitId: project.unitId ?? '',
    unitName: project.unitName ?? '',
    executingUnit: project.executingUnit ?? '',
    year: project.year ?? '',
    period: project.period ?? '',
    category: project.category ?? '',
    appliedAmount: project.appliedAmount ?? 0,
    approvedAmount: project.approvedAmount ?? 0,
    status: project.status ?? '',
    progress: project.progress ?? 0,
    village: project.village ?? '',
    startDate: project.startDate ?? '',
    endDate: project.endDate ?? '',
    description: project.description ?? '',
    spent: project.spent ?? 0,
    budget: project.budget ?? 0,
    legalAddress: project.legalAddress ?? '',
    contactAddress: project.contactAddress ?? '',
  };
  if (project.representative) {
    flat['representative.name'] = project.representative.name ?? '';
    flat['representative.title'] = project.representative.title ?? '';
    flat['representative.email'] = project.representative.email ?? '';
    flat['representative.phone'] = project.representative.phone ?? '';
    flat['representative.mobile'] = project.representative.mobile ?? '';
  }
  if (project.liaison) {
    flat['liaison.name'] = project.liaison.name ?? '';
    flat['liaison.title'] = project.liaison.title ?? '';
    flat['liaison.email'] = project.liaison.email ?? '';
    flat['liaison.phone'] = project.liaison.phone ?? '';
    flat['liaison.mobile'] = project.liaison.mobile ?? '';
  }
  if (project.commissioner) {
    flat['commissioner.name'] = project.commissioner.name ?? '';
    flat['commissioner.title'] = project.commissioner.title ?? '';
    flat['commissioner.email'] = project.commissioner.email ?? '';
  }
  if (project.chiefStaff) {
    flat['chiefStaff.name'] = project.chiefStaff.name ?? '';
    flat['chiefStaff.title'] = project.chiefStaff.title ?? '';
    flat['chiefStaff.email'] = project.chiefStaff.email ?? '';
  }
  return flat;
}

/** 產出最終 HTML 字串（可寫入 Blob 下載為 .doc 或列印）；標籤與欄位名一致 */
export function renderHtmlDocument(templateHtml: string, data: PlaceholderMap): string {
  return replacePlaceholders(templateHtml, data);
}
