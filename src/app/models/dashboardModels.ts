export interface DashboardResponseDto {
  cards: DashboardCardDto[];
  charts: DashboardChartDto[];
  notifications: DashboardNotificationDto[];
  generatedAt: Date;
}

export interface DashboardCardDto {
  key: string;
  title: string;
  count: number;
  status: 'Normal' | 'Warning' | 'Critical';
  allowedRoles: string[];
  description?: string;
  metadata?: {
    CardType?: string;
    LastUpdated?: string;
    HasUrgent?: boolean;
    UrgentIndicator?: string;
    RequiresBillingAccess?: boolean;
    TotalAmount?: number;
    Currency?: string;
    [key: string]: any;
  };
}

export interface DashboardChartDataPoint {
  label: string;
  value: number;
  date?: string | null;
  metadata?: {
    FullDate?: string;
    DayOfWeek?: string;
    Color?: string;
    Percentage?: number;
    StatusCategory?: string;
    [key: string]: any;
  };
}

export interface DashboardChartDto {
  key: string;
  title: string;
  chartType: 'Bar' | 'Line' | 'Pie' | 'Doughnut';
  dataPoints: DashboardChartDataPoint[];
  allowedRoles: string[];
  options?: {
    ChartType?: string;
    LastUpdated?: string;
    TimeRange?: string;
    XAxisLabel?: string;
    YAxisLabel?: string;
    ShowDataPoints?: boolean;
    ShowTrendLine?: boolean;
    ShowLegend?: boolean;
    ShowPercentages?: boolean;
    TotalTests?: number;
    TotalAmount?: number;
    TotalPayments?: number;
    Currency?: string;
    Description?: string;
    [key: string]: any;
  };
}

export interface DashboardNotificationDto {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: 'High' | 'Normal' | 'Low';
  createdAt: Date | string;
  isRead: boolean;
  actionUrl?: string | null;
  metadata?: {
    Source?: string;
    SampleId?: number;
    CaseNo?: string;
    CustomerId?: number;
    [key: string]: any;
  };
}
export interface DashboardState {
  cards: DashboardCardDto[];
  charts: DashboardChartDto[];
  notifications: DashboardNotificationDto[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date;
  customLayout?: CardLayout[];
}

export interface CardLayout {
  cardKey: string;
  position: number;
  visible: boolean;
}

export interface DashboardCardProps {
  title: string;
  count: number;
  status: 'Normal' | 'Warning' | 'Critical';
  description?: string;
  metadata?: any;
  route?: string;
}

export interface DashboardChartProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: any;
  options?: any;
}

export interface DashboardNotificationProps {
  id: string;
  title: string;
  message: string;
  priority: 'Info' | 'Warning' | 'Critical';
  timestamp: Date;
  route?: string;
  metadata?: any;
}

export interface DashboardLayoutService {
  saveLayout(layout: CardLayout[]): void;
  getLayout(): CardLayout[] | null;
  resetLayout(): void;
  hasCustomLayout(): boolean;
}
