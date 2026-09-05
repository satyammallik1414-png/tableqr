import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";
import type { UserRole } from "@/types";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            restaurant: { select: { name: true } },
            branch: { select: { name: true } },
          },
        });

        if (!user || !user.isActive) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          restaurantId: user.restaurantId,
          branchId: user.branchId,
          restaurantName: user.restaurant?.name ?? null,
          branchName: user.branch?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
        token.restaurantId = user.restaurantId as string | null;
        token.branchId = user.branchId as string | null;
        token.restaurantName = (user as unknown as Record<string, unknown>)
          .restaurantName as string | null;
        token.branchName = (user as unknown as Record<string, unknown>)
          .branchName as string | null;
      } else if (token.id && token.role !== "SUPERADMIN") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role as UserRole;
          }
        } catch {
          // ignore
        }
      }
      return token;
    },
  },
});
