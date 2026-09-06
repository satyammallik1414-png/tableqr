// ─── Enums ────────────────────────────────────────────

export type UserRole = "SUPERADMIN" | "ADMIN" | "MANAGER" | "KITCHEN" | "CASHIER" | "WAITER" | "CUSTOMER";
export type OrderStatus = "PENDING" | "RECEIVED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";
export type PaymentMethod = "CASH" | "UPI" | "CREDIT_CARD" | "DEBIT_CARD";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type QRType = "RESTAURANT_MENU" | "TABLE";

// ─── Prisma Model Interfaces ─────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string | null;
  image: string | null;
  isActive: boolean;
  restaurantId: string | null;
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Restaurant {
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
  isActive: boolean;
  createdAt: Date;
}

export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  address: string | null;
  phone: string | null;
  managerId: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface Table {
  id: string;
  branchId: string;
  tableNumber: number;
  capacity: number;
  status: TableStatus;
  qrCode: string | null;
  qrImage: string | null;
  isActive: boolean;
  currentOrderId: string | null;
  createdAt: Date;
}

export interface RestaurantQRCode {
  id: string;
  secureToken: string;
  type: QRType;
  businessId: string;
  branchId: string;
  tableId: string | null;
  tableName: string | null;
  active: boolean;
  scanCount: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  business?: Restaurant;
  branch?: Branch;
  table?: Table | null;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export interface Category {
  id: string;
  branchId: string;
  name: string;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  preparationTime: number | null;
  isVeg: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isRecommended: boolean;
  variants: MenuItemVariant[] | null;
  addons: MenuItemAddon[] | null;
  sortOrder: number;
  createdAt: Date;
}

export interface MenuItemVariant {
  name: string;
  price: number;
}

export interface MenuItemAddon {
  name: string;
  price: number;
}

export interface Order {
  id: string;
  tableId: string | null;
  branchId: string;
  customerId: string | null;
  status: OrderStatus;
  items: OrderItemData[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  notes: string | null;
  couponCode: string | null;
  priority: boolean;
  qrCodeId?: string | null;
  orderNumber?: string | null;
  orderType?: OrderType;
  submittedAt?: Date;
  acceptedAt?: Date | null;
  estimatedReadyMinutes?: number | null;
  estimatedReadyAt?: Date | null;
  cancelledAt?: Date | null;
  lastUpdatedAt?: Date;
  cancellationReason?: string | null;
  idempotencyKey?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  table?: Table | null;
  branch?: Branch;
  qrCode?: RestaurantQRCode | null;
  statusHistory?: OrderStatusHistory[];
}

export interface OrderItemData {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  variants: MenuItemVariant[] | null;
  addons: MenuItemAddon[] | null;
  notes: string | null;
  image?: string;
  isVeg?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  variants: MenuItemVariant[] | null;
  addons: MenuItemAddon[] | null;
  notes: string | null;
  status: OrderStatus;
  createdAt: Date;
}

export interface Bill {
  id: string;
  orderId: string;
  billNumber: string;
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  splitCount: number;
  notes: string | null;
  paidAt: Date | null;
  generatedById: string | null;
  createdAt: Date;
}

export interface Payment {
  id: string;
  billId: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  status: PaymentStatus;
  processedById: string | null;
  createdAt: Date;
}

export interface Customer {
  id: string;
  restaurantId: string;
  phone: string;
  name: string | null;
  email: string | null;
  totalVisits: number;
  totalSpend: number;
  loyaltyPoints: number;
  tier: string;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  branchId: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPrice: number;
  category: string | null;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  branchId: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

export interface LoyaltyTier {
  id: string;
  restaurantId: string;
  name: string;
  minPoints: number;
  discount: number;
  perks: Record<string, unknown> | null;
}

export interface Coupon {
  id: string;
  restaurantId: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface Settings {
  id: string;
  restaurantId: string;
  key: string;
  value: Record<string, unknown>;
}

// ─── Cart Types ──────────────────────────────────────

export interface CartItem {
  menuItemId: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  variants: MenuItemVariant[] | null;
  addons: MenuItemAddon[] | null;
  notes: string;
  isVeg: boolean;
  preparationTime: number | null;
}

export interface CartState {
  items: CartItem[];
  tableId: string | null;
  branchId: string | null;
  restaurantId: string | null;
  specialInstructions: string;
  couponCode: string;
}

// ─── Socket Types ────────────────────────────────────

export interface SocketEvent {
  event: string;
  data: Record<string, unknown>;
  room?: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
  isRead: boolean;
}

// ─── Analytics Types ─────────────────────────────────

export interface AnalyticsData {
  revenueToday: number;
  ordersToday: number;
  activeTables: number;
  newCustomers: number;
  revenueTrend: { date: string; amount: number }[];
  orderVolume: { date: string; count: number }[];
  topItems: { name: string; count: number; revenue: number }[];
  peakHours: { hour: number; count: number }[];
  categoryPerformance: { name: string; count: number; revenue: number }[];
  averageOrderValue: number;
  tablesTurned: number;
  averagePrepTime: number;
}

// ─── Report Types ────────────────────────────────────

export interface ReportFilter {
  startDate: string;
  endDate: string;
  branchId?: string;
  type: "SALES" | "TAX" | "INVENTORY" | "CUSTOMER";
  format: "PDF" | "EXCEL";
}

// ─── API Types ───────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Auth Types ──────────────────────────────────────

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image: string | null;
    restaurantId: string | null;
    branchId: string | null;
    restaurantName?: string;
    branchName?: string;
  };
  expires: string;
}

export * from "./super-admin";
