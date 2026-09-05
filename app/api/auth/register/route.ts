import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  restaurantName: z.string().min(2),
  phone: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { name, email, password, restaurantName, phone } = parsed.data;

    const passwordHash = await hash(password, 12);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug: restaurantName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
          phone,
        },
      });

      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: "Main Branch",
          phone,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
          restaurantId: restaurant.id,
          branchId: branch.id,
        },
      });

      await tx.settings.createMany({
        data: [
          { restaurantId: restaurant.id, key: "tax_cgst", value: 2.5 },
          { restaurantId: restaurant.id, key: "tax_sgst", value: 2.5 },
          { restaurantId: restaurant.id, key: "service_charge", value: 10 },
          { restaurantId: restaurant.id, key: "currency", value: "INR" },
          { restaurantId: restaurant.id, key: "timezone", value: "Asia/Kolkata" },
        ],
      });

      return { user, restaurant, branch };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: result.user.id,
          restaurantId: result.restaurant.id,
          branchId: result.branch.id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
