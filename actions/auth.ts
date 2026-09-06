"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { AuthError } from "next-auth";

export async function loginAction(data: {
  email: string;
  password: string;
  callbackUrl?: string | null;
}) {
  try {
    const email = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { success: false, error: "Invalid email or password." };
    }

    const isValid = await compare(data.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Invalid email or password." };
    }

    // Determine target redirect based on role or superadmin email
    const role = (user.role ?? "").toUpperCase();
    const isSuperAdmin =
      email === "satyammallik1414@gmail.com" ||
      email === "superadmin@smartserve.ai" ||
      role === "SUPERADMIN" ||
      role === "SUPER_ADMIN";

    let targetUrl = isSuperAdmin ? "/super-admin" : data.callbackUrl;
    if (!targetUrl || targetUrl === "/login" || targetUrl === "/") {
      if (role === "KITCHEN") {
        targetUrl = "/kitchen";
      } else if (role === "CASHIER") {
        targetUrl = "/counter";
      } else {
        targetUrl = "/admin/dashboard";
      }
    }

    try {
      await signIn("credentials", {
        email,
        password: data.password,
        redirect: false,
      });
    } catch (signInErr) {
      if (signInErr instanceof AuthError) {
        return { success: false, error: "Invalid email or password." };
      }
      // If Next.js redirect was thrown, it means sign-in succeeded
      const errStr = String(signInErr);
      if (!errStr.includes("NEXT_REDIRECT")) {
        console.error("signIn error:", signInErr);
        return { success: false, error: "Authentication failed. Please try again." };
      }
    }

    return { success: true, redirectUrl: targetUrl };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Invalid email or password." };
    }
    console.error("loginAction error:", error);
    return { success: false, error: "Invalid email or password." };
  }
}
