export type PerfStatus = 'fast' | 'moderate' | 'slow' | 'stuck';

export interface PerfApiMetric {
  id: string;
  traceId: string;
  url: string;
  cleanUrl: string;
  method: string;
  status: number;
  statusText?: string;
  startTime: number;
  endTime?: number;
  duration?: number; // in milliseconds
  ttfb?: number; // Time To First Byte (ms)
  downloadTime?: number;
  requestSize?: number;
  responseSize?: number;
  isDuplicate: boolean;
  duplicateCount: number;
  isStuck: boolean;
  isSlow: boolean;
  errorMessage?: string;
  timestamp: Date;
}

export interface PerfEventTransaction {
  id: string;
  name: string;
  triggerType: 'click' | 'route' | 'input' | 'programmatic';
  targetElement?: string;
  startTime: number;
  apiEndTime?: number;
  renderEndTime?: number;
  totalDuration?: number; // startTime -> renderEndTime
  apiDuration?: number;   // total time spent across APIs
  renderDuration?: number; // apiEndTime -> renderEndTime (DOM Paint)
  apis: PerfApiMetric[];
  duplicates: PerfApiMetric[];
  slowApis: PerfApiMetric[];
  stuckApis: PerfApiMetric[];
  recommendations: string[];
  domNodeCount?: number;
  status: PerfStatus;
  timestamp: Date;
}

export interface PerfSummaryStats {
  totalEvents: number;
  totalApis: number;
  totalDuplicates: number;
  totalSlowApis: number;
  totalStuckApis: number;
  avgApiDuration: number;
  avgRenderDuration: number;
  avgTotalDuration: number;
  slowestEndpoint?: { url: string; duration: number };
  mostFrequentEndpoint?: { url: string; count: number };
}

export interface PerfConfig {
  enabled: boolean;
  logToConsole: boolean;
  showFloatingHud: boolean;
  slowApiThresholdMs: number;
  stuckApiThresholdMs: number;
  duplicateWindowMs: number;
  maxStoredTransactions: number;
}
