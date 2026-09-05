import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";

/**
 * Edge-compatible auth configuration.
 * This file must NOT import Prisma, bcryptjs, or any Node.js-only modules.
 * It is used by middleware.ts which runs in the Edge Runtime.
 */
export const authConfig: NextAuthConfig = {
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "smartserve-dev-secret-key-change-in-production-123!",
  providers: [],  // Providers are added in the full auth.ts
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.restaurantId = token.restaurantId as string | null;
        session.user.branchId = token.branchId as string | null;
        (session.user as unknown as Record<string, unknown>).restaurantName =
          token.restaurantName;
        (session.user as unknown as Record<string, unknown>).branchName =
          token.branchName;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
};
