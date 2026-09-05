import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  restaurantName: z.string().min(2, "Restaurant name is required"),
  phone: z.string().min(10, "Valid phone number required"),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be positive"),
  preparationTime: z.number().int().positive().optional(),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  image: z.string().optional(),
  variants: z
    .array(
      z.object({
        name: z.string(),
        price: z.number().positive(),
      }),
    )
    .optional(),
  addons: z
    .array(
      z.object({
        name: z.string(),
        price: z.number().positive(),
      }),
    )
    .optional(),
});

export const orderSchema = z.object({
  tableId: z.string().min(1, "Table is required"),
  branchId: z.string().min(1, "Branch is required"),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        name: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
        variants: z
          .array(
            z.object({ name: z.string(), price: z.number() }),
          )
          .optional(),
        addons: z
          .array(
            z.object({ name: z.string(), price: z.number() }),
          )
          .optional(),
        notes: z.string().optional(),
        isVeg: z.boolean().optional(),
        image: z.string().optional(),
      }),
    )
    .min(1, "At least one item required"),
  subtotal: z.number().positive(),
  tax: z.number().default(0),
  serviceCharge: z.number().default(0),
  total: z.number().positive(),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "RECEIVED",
    "PREPARING",
    "READY",
    "SERVED",
    "COMPLETED",
    "CANCELLED",
  ]),
});

export const qrGenerateSchema = z.object({
  type: z.enum(["RESTAURANT_MENU", "TABLE"]),
  branchId: z.string().min(1, "Branch ID is required"),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
});

export const customerOrderItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  selectedVariant: z.object({ name: z.string(), price: z.number() }).optional(),
  selectedAddons: z.array(z.object({ name: z.string(), price: z.number() })).optional(),
  notes: z.string().max(300).optional(),
});

export const customerOrderSubmitSchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
  tableId: z.string().optional().nullable(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("DINE_IN"),
  customerName: z.string().min(1, "Name is required").max(100),
  customerPhone: z.string().min(6, "Valid phone number is required").max(20),
  items: z.array(customerOrderItemSchema).min(1, "At least one item is required"),
  notes: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().optional(),
  paymentMethod: z.enum(["UPI", "CASH", "CREDIT_CARD", "DEBIT_CARD", "CARD"]).default("UPI"),
  paymentReference: z.string().max(100).optional().nullable(),
  paymentStatus: z.enum(["PENDING", "PAID"]).default("PENDING"),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "RECEIVED",
    "PREPARING",
    "READY",
    "SERVED",
    "COMPLETED",
    "CANCELLED",
  ]),
  estimatedReadyMinutes: z.number().int().min(1).max(240).optional(),
  cancellationReason: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export const billSchema = z.object({
  orderId: z.string().min(1),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["PERCENTAGE", "FLAT"]).default("FLAT"),
  serviceCharge: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "UPI", "CREDIT_CARD", "DEBIT_CARD"]),
  splitCount: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const tableSchema = z.object({
  tableNumber: z.number().int().positive(),
  capacity: z.number().int().positive().default(4),
});

export const inventorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().default("pcs"),
  currentStock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  costPrice: z.number().min(0).default(0),
  category: z.string().optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["MANAGER", "KITCHEN", "CASHIER", "WAITER"]),
  phone: z.string().optional(),
  branchId: z.string().min(1),
});

export const couponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  discountType: z.enum(["PERCENTAGE", "FLAT"]),
  discountValue: z.number().positive(),
  minOrder: z.number().min(0).default(0),
  maxUses: z.number().int().positive().default(100),
  expiresAt: z.string().optional(),
});

export const analyticsFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  branchId: z.string().optional(),
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

export * from "./validations/super-admin";

