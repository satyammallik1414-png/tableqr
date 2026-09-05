import type { BusinessStatus, SubscriptionStatus, BillingCycle, InvoiceStatus } from "@prisma/client";

export interface SuperAdminDashboardMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalBranches: number;
  totalUsers: number;
  totalCustomers: number;
  ordersToday: number;
  revenueToday: number;
  mrr: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  recentRegistrations: Array<{
    id: string;
    name: string;
    ownerName: string | null;
    ownerEmail: string | null;
    createdAt: Date;
    status: BusinessStatus;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: Date;
    businessName: string;
  }>;
  revenueTrend: Array<{ date: string; amount: number }>;
  businessGrowthTrend: Array<{ date: string; count: number }>;
  topBusinessesByRevenue: Array<{
    id: string;
    name: string;
    revenue: number;
    ordersCount: number;
    branchesCount: number;
  }>;
}

export interface BusinessItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  currency: string;
  timezone: string;
  status: BusinessStatus;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  maxBranches: number | null;
  maxStaff: number | null;
  maxCustomers: number | null;
  maxOrders: number | null;
  isActive: boolean;
  createdAt: Date;
  _count?: {
    branches: number;
    users: number;
    customers: number;
    subscriptions: number;
  };
  currentSubscription?: {
    id: string;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    startDate: Date;
    endDate: Date;
    plan: {
      id: string;
      name: string;
      monthlyPrice: number;
      yearlyPrice: number;
    };
  } | null;
}

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  maxBranches: number;
  maxStaff: number;
  maxCustomers: number;
  maxOrders: number;
  features: string[] | Record<string, unknown> | null;
  trialDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    subscriptions: number;
  };
}

export interface SubscriptionItem {
  id: string;
  restaurantId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
  };
  plan: {
    id: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
  };
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  restaurantId: string;
  subscriptionId: string | null;
  amount: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  pdfUrl: string | null;
  createdAt: Date;
  restaurant: {
    id: string;
    name: string;
  };
  subscription?: {
    plan: {
      name: string;
    };
  } | null;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  restaurantId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  restaurant?: {
    id: string;
    name: string;
  } | null;
}

export interface PlatformSettingItem {
  id: string;
  key: string;
  value: Record<string, unknown> | string | number | boolean;
  description: string | null;
  updatedAt: Date;
}

export interface PlanLimitValidationResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  message?: string;
}
