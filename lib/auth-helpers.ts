import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export function isSuperAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === "SUPERADMIN" || normalized === "SUPER_ADMIN";
}

export async function getAuthenticatedSession() {
  const session = await auth();
  return session;
}

export async function requireSuperAdmin() {
  const session = await getAuthenticatedSession();
  if (!session?.user?.id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized. Super Admin access required. Please sign in." },
        { status: 401 }
      ),
      session: null,
    };
  }

  let role = session.user.role;

  // DB fallback check if role in token is not SUPERADMIN
  if (!isSuperAdminRole(role)) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      if (dbUser) {
        role = dbUser.role;
        session.user.role = dbUser.role;
      }
    } catch {
      // ignore db error
    }
  }

  if (!isSuperAdminRole(role)) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized. Super Admin access required. Please sign out and sign in with superadmin@smartserve.ai" },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { errorResponse: null, session };
}

export async function requireBusinessAdmin(restaurantId?: string | null) {
  const session = await getAuthenticatedSession();
  if (!session?.user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      ),
      session: null,
    };
  }

  // Super Admin can access any business
  if (isSuperAdminRole(session.user.role)) {
    return { errorResponse: null, session };
  }

  // Business Admin / Admin can access their own business
  if (
    restaurantId &&
    session.user.restaurantId === restaurantId &&
    ["ADMIN", "MANAGER"].includes(session.user.role)
  ) {
    return { errorResponse: null, session };
  }

  return {
    errorResponse: NextResponse.json(
      { success: false, error: "Forbidden. Access denied to this business data." },
      { status: 403 }
    ),
    session: null,
  };
}
