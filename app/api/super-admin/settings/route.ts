import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET() {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Fetch Settings Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch platform settings." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { key, value, description } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Setting key is required." },
        { status: 400 }
      );
    }

    const setting = await prisma.platformSetting.upsert({
      where: { key },
      update: {
        value: value ?? {},
        description: description ?? undefined,
      },
      create: {
        key,
        value: value ?? {},
        description: description ?? null,
      },
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "UPDATE_PLATFORM_SETTING",
      entity: "PlatformSetting",
      entityId: setting.id,
      metadata: { key, value },
    });

    return NextResponse.json({
      success: true,
      message: "Platform setting saved successfully.",
      data: setting,
    });
  } catch (error) {
    console.error("Save Setting Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save platform setting." },
      { status: 500 }
    );
  }
}
