// 游戏活动相关类型定义

export interface GameActivity {
  id: string;
  activityId?: string;
  region: string;
  language: string;
  startDatetime: string;
  endDatetime: string;
  imageUrl: string;
  syncStatus: 'success' | 'failed';
  syncError?: string;
}

export interface GameActivityListParams {
  region?: string;
  language?: string;
  year?: number;
  month?: number;
}

export interface GameActivityListResponse {
  items: GameActivity[];
  total: number;
}

// 谷歌表格同步相关类型
export interface GoogleSheetSyncResult {
  success: boolean;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  failedCount: number;
  errors: string[];
}

// 插件输入输出类型
export interface GoogleSheetInput {
  url: string;
}

export interface GoogleSheetOutput {
  activities: Array<{
    region: string;
    language: string;
    startDatetime: string;
    endDatetime: string;
    imageUrl: string;
  }>;
}
