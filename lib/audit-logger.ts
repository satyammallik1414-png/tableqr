import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface AuditLogOptions {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  restaurantId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAuditLog(options: AuditLogOptions) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        actorId: options.actorId ?? null,
        actorEmail: options.actorEmail ?? null,
        actorRole: options.actorRole ?? null,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId ?? null,
        restaurantId: options.restaurantId ?? null,
        ipAddress: options.ipAddress ?? null,
        metadata: options.metadata ? (options.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
    return log;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}
