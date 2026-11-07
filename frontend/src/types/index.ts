export type RecurrenceType = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type InstanceStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type BillingStage = 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE' | 'MANUAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface WhatsAppInstance {
  id: string;
  name: string;
  instanceName: string;
  status: InstanceStatus;
  phone?: string | null;
  qrcode?: string | null;
  lastConnectionAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    customers: number;
    messages: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  dueDate: string;
  recurrence: RecurrenceType;
  amount?: number | string | null;
  whatsappId: string;
  customMessage?: string | null;
  status: CustomerStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  whatsapp?: {
    id: string;
    name: string;
    status: InstanceStatus;
  };
  payments?: Payment[];
  messages?: MessageHistory[];
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number | string;
  paidAt: string;
  dueDateReference: string;
  notes?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface MessageHistory {
  id: string;
  customerId?: string | null;
  whatsappId?: string | null;
  phone: string;
  message: string;
  stage: BillingStage;
  status: MessageStatus;
  failureReason?: string | null;
  sentAt?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  whatsapp?: {
    id: string;
    name: string;
  };
}

export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  overdueCustomers: number;
  upcomingCustomers: number;
  dueTodayCustomers: number;
  sentMessages: number;
  failedMessages: number;
  connectedWhatsAppCount: number;
  totalWhatsAppCount: number;
  revenueThisMonth: number;
  paymentsCountThisMonth: number;
}

export interface BillingSettings {
  DAYS_BEFORE_DUE: number;
  SEND_ON_DUE_DATE: boolean;
  DAYS_AFTER_DUE: number;
  SEND_START_HOUR: string;
  SEND_END_HOUR: string;
  MIN_DELAY_SECONDS: number;
  MAX_DELAY_SECONDS: number;
  DEFAULT_MESSAGE_BEFORE: string;
  DEFAULT_MESSAGE_DUE: string;
  DEFAULT_MESSAGE_AFTER: string;
  PIX_KEY: string;
  COMPANY_NAME: string;
  PAYMENT_LINK: string;
}
