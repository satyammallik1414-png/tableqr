export const APP_NAME = "SmartServe AI";
export const APP_DESCRIPTION =
  "AI-powered restaurant & cafe management system with QR ordering, kitchen display, and billing.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  KITCHEN: "KITCHEN",
  CASHIER: "CASHIER",
  WAITER: "WAITER",
} as const;

export const ROLE_HIERARCHY: Record<string, number> = {
  SUPERADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  CASHIER: 40,
  KITCHEN: 30,
  WAITER: 20,
};

export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border border-amber-200",
  RECEIVED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-yellow-100 text-yellow-800",
  READY: "bg-green-100 text-green-800",
  SERVED: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const TABLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-500",
  OCCUPIED: "bg-red-500",
  RESERVED: "bg-blue-500",
  CLEANING: "bg-yellow-500",
};

export const DEFAULT_TAX_RATES = {
  CGST: 2.5,
  SGST: 2.5,
  SERVICE_CHARGE: 10,
};

export const LOYALTY_TIERS = [
  { name: "BRONZE", minPoints: 0, discount: 0, perks: [] },
  { name: "SILVER", minPoints: 100, discount: 5, perks: ["Free drink"] },
  { name: "GOLD", minPoints: 500, discount: 10, perks: ["Free drink", "Priority seating"] },
  { name: "PLATINUM", minPoints: 1000, discount: 15, perks: ["Free drink", "Priority seating", "15% off"] },
] as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const UPI_IDS = {
  GOOGLE_PAY: "paytm@paytm",
  PHONE_PE: "phonepe@paytm",
  PAYTM: "paytm@paytm",
};
