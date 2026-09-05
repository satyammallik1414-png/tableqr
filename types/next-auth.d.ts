import { DefaultSession, DefaultUser } from "next-auth";
import { UserRole } from "./index";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    restaurantId?: string | null;
    branchId?: string | null;
    restaurantName?: string | null;
    branchName?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      restaurantId: string | null;
      branchId: string | null;
      restaurantName?: string | null;
      branchName?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    restaurantId: string | null;
    branchId: string | null;
    restaurantName?: string | null;
    branchName?: string | null;
  }
}
