import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(10).max(20),
  password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || "Invalid details" }, { status: 400 });
    const { name, email, phone, password } = parsed.data;
    if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ success: false, error: "An account with this email already exists. Please sign in." }, { status: 409 });
    await prisma.user.create({ data: { name, email, phone, passwordHash: await hash(password, 12), role: "CUSTOMER" } });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Customer registration error:", error);
    return NextResponse.json({ success: false, error: "Could not create your account. Please try again." }, { status: 500 });
  }
}
