// src/lib/pocketbase.ts — 使用根目錄單一 pb 實例，不重複 new PocketBase
import { pb } from '../pocketbase';

export const initAppData = async () => {
  try {
    // 自動登入管理員
    await pb.collection('users').authWithPassword('admin@demo.com', 'adminpassword123');

    const [plans, monthlyReports] = await Promise.all([
      pb.collection('plans').getFullList(),
      pb.collection('monthly_reports').getFullList(),
    ]);

    return {
      projects: plans.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: (p.name as string) || (p.projectName as string),
        unitId: p.unitId,
        unitName: (p.executingUnit as string) || (p.unitName as string),
        budget: (p.total_budget as number) ?? (p.budget as number) ?? 0,
        spent: (p.spent as number) ?? 0,
        status: (p.status as string) || '進行中',
      })),
      monthlyReports: monthlyReports.map((r: Record<string, unknown>) => {
        let expenditures: unknown[] = [];
        try {
          expenditures = JSON.parse((r.expenditures as string) || '[]') as unknown[];
        } catch {
          expenditures = [];
        }
        return {
          id: r.id,
          projectId: r.plan_id,
          month: r.month,
          progressDesc: r.progress_desc,
          expenditures,
          receiptUrl: r.receipt_url,
        };
      }),
    };
  } catch (error) {
    console.error('資料載入失敗:', error);
    return { projects: [], monthlyReports: [] };
  }
};

export const saveMonthlyReport = async (report: {
  projectId: string;
  month: string;
  progressDesc?: string;
  progress_desc?: string;
  expenditures: Array<{ amount?: number }>;
  receiptUrl?: string | null;
}) => {
  const totalSpent = report.expenditures.reduce((sum: number, e: { amount?: number }) => sum + (e.amount || 0), 0);

  return pb.collection('monthly_reports').create({
    plan_id: report.projectId,
    month: report.month,
    progress_desc: report.progressDesc || report.progress_desc,
    expense_amount: totalSpent,
    expenditures: JSON.stringify(report.expenditures),
    receipt_url: report.receiptUrl ?? null,
  });
};

export const updateProjectBudget = async (projectId: string, spent: number) => {
  return pb.collection('plans').update(projectId, { spent });
};

export { pb };
