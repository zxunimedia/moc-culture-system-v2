
export enum ProjectStatus {
  PLANNING = '規劃中',
  ONGOING = '執行中',
  REVIEWING = '考評中',
  COMPLETED = '已結案',
  STALLED = '進度落後'
}

export enum KRStatus {
  ON_TRACK = '符合進度',
  DELAYED = '進度落後',
  AHEAD = '進度超前',
  NOT_STARTED = '尚未開始'
}

export enum BudgetCategory {
  PERSONNEL = '人事費',
  OPERATING = '業務費',
  MISCELLANEOUS = '雜支'
}

// 經費來源
export enum FundingSource {
  SUBSIDY = '補助款',
  SELF_FUNDED = '自籌款'
}

export enum UserRole {
  ADMIN = 'MOC_ADMIN',
  OPERATOR = 'UNIT_OPERATOR',
  COACH = 'COACH'  // 輔導老師
}

export interface User {
  id: string;
  name?: string;  // 用戶名稱
  email: string;
  password?: string;  // 密碼（僅在創建時使用）
  role: UserRole;
  unitId?: string;
  unitName?: string;  // 單位名稱
  /** PocketBase 實際欄位名（snake_case） */
  assigned_projects?: string[];
  /** 前端相容用，若後端用 assigned_projects 需在 App 中映射 */
  assignedProjectIds?: string[];
  createdAt?: string;  // 帳號創建時間
  lastLogin?: string;  // 最後登錄時間
}

/** 計畫-使用者樞紐（plan_user 表） */
export interface PlanUser {
  id: string;
  user: string;   // user id
  userId?: string;
  plan_id?: string;
  planId?: string;
  plan?: string;
  project?: string;
  projectId?: string;
  role?: string;
}

export interface ContactInfo {
  name: string;
  title: string;
  phone?: string;
  mobile?: string;
  email: string;
}

// 撥付進度表格欄位
export interface GrantPaymentRecord {
  stage: string;           // 撥款款期
  documentSentDate?: string; // 公文發出日期
  paymentReceivedDate?: string; // 入帳日期
}

export interface AssessmentResult {
  status: KRStatus;
  strategy: string;
}

export interface VisitRow {
  id: string;
  workItem: string;
  opinion: string;
  status: KRStatus;
  strategy: string;
}

export interface KRReport {
  krId: string;
  executionNote: string;
  progress: number;
  status: KRStatus;
  improvementStrategy: string;
}

// 工作事項執行紀錄（連動關鍵結果 KR）
export interface WorkItemReport {
  id: string;
  krId: string;              // 對應的關鍵結果 ID
  executionNote: string;     // 執行內容說明
  achievedValue: number;     // 當月達成數
  attachments: string[];     // 附件/佐證資料
}

// 支出明細（連動預算科目）
export interface ExpenditureDetail {
  id: string;
  budgetItemId: string;      // 對應的預算科目 ID
  fundingSource: FundingSource; // 經費來源：補助款/自籌款
  amount: number;            // 本月支出金額
  description: string;       // 支出說明
  receiptUrls: string[];     // 憑證/發票圖片
}

export interface MonthlyReport {
  id?: string;
  projectId: string;
  month: string;
  workItems: WorkItemReport[];     // 工作事項執行紀錄
  expenditures: ExpenditureDetail[]; // 支出明細
  fanpageLinks?: string[];         // 粉絲頁貼文連結
  summary: string;                 // 成果說明
  submittedAt?: string;
  progress?: number;               // 本月進度 (%)，寫入後可連動更新計畫的 progress
  isDraft?: boolean;
  savedAt?: string;
  // 向下相容舊版欄位
  krReports?: KRReport[];
}

export interface CoachingRecord {
  id: string; 
  projectId: string;
  serialNumber: string; 
  location: string;
  frequency: string;
  method: '實地訪視' | '視訊' | '電話' | '其他';
  writer: string;
  date: string;
  startTime: string;
  endTime: string;
  // 訪視紀錄表類型：'coach' = 輔導老師版, 'team' = 輔導團隊版
  recordType?: 'coach' | 'team';
  attendees: {
    commissioners: boolean;
    staff: boolean;
    representatives: boolean;
    liaison: boolean;
    others: string;
    othersChecked?: boolean;
  };
  // 輔導老師版專用欄位
  coachAttendees?: {
    coach: string;           // 輔導老師
    unitStaff: string;       // 受訪單位人員
    otherStaff: string;      // 其他單位人員
  };
  planSummary?: {
    period: string;          // 計畫期程
    okrSummary: string;      // 計畫OKR簡表
    reviewMechanism: string; // 定期檢討機制
  };
  progressStatus?: '嚴重落後' | '稍微落後' | '符合' | '超前進度';
  coachObservation?: {
    executionStatus: string;     // 一、計畫執行狀況說明
    teamSuggestion: string;      // 二、提供團隊建議（含適時引介相關資源）
    mocSuggestion: string;       // 三、提供本部建議
  };
  overallResults: {
    progress: AssessmentResult;
    content: AssessmentResult;
    records: AssessmentResult;
    vouchers: AssessmentResult;
  };
  visitContents: VisitRow[];
  communityMobilization: VisitRow;
  communityConnection: VisitRow;
  photos: string[];
  attachmentUrl?: string;
  operatorFeedback?: string; 
  keyPoints?: string;
}

export interface KeyResult {
  id: string;
  description: string;
  targetValue: number;
  expectedDate: string;
  budgetAmount?: number;      // 預算金額
  actualAmount?: number;      // 實際執行金額
  outcomeDescription?: string;
}

export interface Objective {
  id: string;
  title: string;
  weight: number; 
  keyResults: KeyResult[];
}

// 願景層級：願景 → 目標 → 關鍵結果
export interface Vision {
  id: string;
  title: string;           // 願景標題
  description?: string;    // 願景描述
  objectives: Objective[];  // 該願景下的目標
}

export interface BudgetItem {
  id: string;
  category: BudgetCategory;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  description: string;
}

export interface GrantStage {
  stage: string; 
  documents: GrantDocument[];
  submissionDate?: string;       // 檢送日期
  deadline?: string;             // 截止日期
  documentSentDate?: string;     // 公文發出日期
  paymentReceivedDate?: string;  // 入帳日期
  paymentDate?: string; 
  mocFinalCheck: MOCCheckStatus; // 文化部獨立檢核點
  mocRemark?: string;            // 文化部審核意見
}

export interface GrantDocument {
  name: string;
  status: GrantDocStatus;
  fileUrl?: string; 
  remark?: string;
  checked?: boolean;    // 是否已勾選確認
  fileName?: string;    // 上傳的檔案名稱
}

export type GrantDocStatus = '—' | '未上傳' | '已上傳' | '已收到' | '審核中' | '已退回' | '待補件' | '已完成';
export type MOCCheckStatus = '待檢核' | '符合' | '不符合' | '—';

export interface Project {
  id: string;
  projectCode?: string;      // 計畫編號（用於輔導紀錄序號）
  unitId: string;
  unitName: string;
  assignedCoaches?: string[];   // 指派的輔導老師 ID 列表
  assignedOperators?: string[]; // 指派的操作人員 ID 列表
  name: string;
  executingUnit: string;
  year: string;
  period: string; 
  category: string;  // 兼容表單值：原鄉/都市文化行動及其無涉/涉及產業及就業等
  representative: ContactInfo;
  liaison: ContactInfo;
  legalAddress: string;
  contactAddress: string;
  siteTypes: ('原鄉' | '都市')[];  // 可多選
  sites: string[];
  appliedAmount: number;
  approvedAmount: number;
  commissioner: ContactInfo;
  chiefStaff: ContactInfo;
  visionText?: string;      // 舊版願景文字（向下相容）
  visions: Vision[];         // 新版願景結構：願景 → 目標 → 關鍵結果 
  budgetItems: BudgetItem[];
  grants: GrantStage[];
  coachingRecords: CoachingRecord[];
  status: ProjectStatus;
  progress: number;
  village: string;
  startDate: string;
  endDate: string;
  description: string;
  spent: number;
  budget: number;
}

export interface Report {
  id: string;
  projectId: string;
  date: string;
  title: string;
  content: string;
  images: string[];
}

// 輔導結案報告
export interface CoachingFinalReport {
  id: string;
  projectId: string;
  coachId: string;                    // 輔導老師 ID
  visitSummaries: {                   // 訪視紀錄摘要列表
    date: string;                     // 訪視日期
    keyPoints: string;                // 整體訪視重點
  }[];
  comprehensiveOpinion: string;       // 綜合輔導意見
  allPhotos: string[];                // 所有訪視照片
  createdAt: string;
  updatedAt?: string;
}

// 共用檔案資料（shared_files collection）
export interface SharedFile {
  id: string;
  title: string;          // 檔案標題
  category: string;       // 檔案分類
  file: string;           // PocketBase 存儲的檔名
  created: string;        // 創建時間
}
