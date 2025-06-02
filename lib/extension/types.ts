export interface ProtectedSite {
  id: string;
  domain: string;
  password?: string;
  timeLimit?: number; // in minutes
  lastAccess?: number;
  createdAt: number;
}

export interface TimeTrackingData {
  [domain: string]: {
    [date: string]: number; // milliseconds
  };
}

export interface StorageData {
  protectedSites: ProtectedSite[];
  timeTrackingData: TimeTrackingData;
}

export interface AnalyticsData {
  [domain: string]: {
    totalTime: number;
    dailyData: { [date: string]: number };
    averageDaily: number;
  };
}

export interface TimerData {
  timer: NodeJS.Timeout;
  domain: string;
  startTime: number;
}

export interface SiteFormData {
  domain: string;
  password?: string;
  timeLimit?: number;
}

export type BlockReason = 'PASSWORD_REQUIRED' | 'TIME_LIMIT_EXCEEDED';

export interface ChromeMessage {
  action: string;
  data?: Record<string, unknown>;
  domain?: string;
  password?: string;
  period?: number;
  reason?: BlockReason;
  url?: string;
}

export interface ChromeMessageResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ExportData {
  protectedSites: ProtectedSite[];
  timeTrackingData: TimeTrackingData;
  exportDate: string;
  version: string;
} 