import { z } from "zod";

export const businessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  ownerName: z.string().min(2, "Owner name is required"),
  ownerEmail: z.string().email("Valid owner email is required"),
  ownerPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Valid email").optional().nullable().or(z.literal("")),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "EXPIRED"]).default("ACTIVE"),
  maxBranches: z.coerce.number().min(1).optional().nullable(),
  maxStaff: z.coerce.number().min(1).optional().nullable(),
  maxCustomers: z.coerce.number().min(1).optional().nullable(),
  maxOrders: z.coerce.number().min(1).optional().nullable(),
  planId: z.string().optional().nullable(),
});

export const planSchema = z.object({
  name: z.string().min(2, "Plan name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().optional().nullable(),
  monthlyPrice: z.coerce.number().min(0, "Price must be non-negative"),
  yearlyPrice: z.coerce.number().min(0, "Price must be non-negative"),
  maxBranches: z.coerce.number().min(1, "At least 1 branch required"),
  maxStaff: z.coerce.number().min(1, "At least 1 staff member required"),
  maxCustomers: z.coerce.number().min(1, "At least 1 customer limit required"),
  maxOrders: z.coerce.number().min(1, "At least 1 order limit required"),
  trialDays: z.coerce.number().min(0, "Trial days cannot be negative").default(14),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).or(z.record(z.unknown())).optional().nullable(),
});

export const subscriptionSchema = z.object({
  restaurantId: z.string().min(1, "Business ID is required"),
  planId: z.string().min(1, "Subscription Plan is required"),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"]).default("ACTIVE"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  autoRenew: z.boolean().default(true),
});

export const platformSettingSchema = z.object({
  key: z.string().min(2, "Key is required"),
  value: z.unknown(),
  description: z.string().optional().nullable(),
});
