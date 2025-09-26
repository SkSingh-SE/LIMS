export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdOn: string;
  // optional fields
  entityId?: number;
  entityType?: string;
  data?: any;
}
