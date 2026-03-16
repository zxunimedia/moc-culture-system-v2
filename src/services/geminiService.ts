
import { GoogleGenAI, Type } from "@google/genai";
import { Project, Report } from "../types";

// 延遲初始化 AI，避免在沒有 API key 時報錯
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const analyzeProjectStatus = async (project: Project, reports: Report[]) => {
  const aiInstance = getAI();
  if (!aiInstance) {
    return "AI 分析功能需要設定 API Key。";
  }
  
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    請以專業考評委員的角度，分析以下原住民村落文化發展計畫的執行現況：
    計畫名稱：${project.name}
    部落：${project.village}
    預算執行率：${((Number(project.budget) || 0) > 0 ? ((Number(project.spent) || 0) / (Number(project.budget) || 1) * 100).toFixed(1) : '0')}%
    目前進度：${project.progress}%
    最新執行日誌：${reports.map(r => r.content).join('\n')}
    
    請提供：
    1. 執行成效評估 (重點摘要)
    2. 可能面臨的風險
    3. 具體改善建議
  `;

  try {
    const response = await aiInstance.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "無法生成 AI 分析報告，請稍後再試。";
  }
};

export const generateExecutiveSummary = async (projects: Project[]) => {
  const aiInstance = getAI();
  if (!aiInstance) {
    return "AI 摘要功能需要設定 API Key。";
  }
  
  const model = 'gemini-3-flash-preview';
  const dataString = projects.map(p => `${p.name}(${p.status}, 進度${p.progress}%)`).join(', ');
  
  const prompt = `
    你現在是文化部計畫督導主管。請根據以下多個原村計畫的狀態數據，生成一份簡短的高階管理摘要：
    數據：${dataString}
    請分析整體執行趨勢，並點出需要特別關注的環節。
  `;

  try {
    const response = await aiInstance.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "摘要生成失敗。";
  }
};

/** 期末結案報告：綜合輔導意見 AI 撰寫建議（正面論述，約 500–800 字） */
export const generateFinalReportOpinionSuggestion = async (
  visitSummaries: { date: string; keyPoints: string }[]
): Promise<string> => {
  const aiInstance = getAI();
  if (!aiInstance) {
    throw new Error("AI 功能需要設定 API Key。");
  }
  const model = 'gemini-3-flash-preview';
  const summaryText = visitSummaries
    .map((s) => `【${s.date}】${s.keyPoints || '無'}`)
    .join('\n');
  const prompt = `
    你是文化部原村計畫的輔導老師，正在撰寫「綜合輔導意見」。
    以下為本年度訪視/諮詢紀錄摘要：
    ${summaryText}
    請用專業、正面的語氣，撰寫一段綜合輔導意見（約 500–800 字），內容需包含：
    1. 計畫執行整體觀察與亮點
    2. 團隊合作與資源運用之肯定
    3. 具體建議與未來可強化方向（以建設性表述為主）
    請直接輸出意見內容，不要加標題或前言。
  `;
  const response = await aiInstance.models.generateContent({ model, contents: prompt });
  return response.text ?? '';
};
