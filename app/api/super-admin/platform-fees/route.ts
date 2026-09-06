import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit-logger";
import { PLATFORM_FEE_DEFAULT_KEY, platformFeeRestaurantKey } from "@/lib/platform-fee";

function parseAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 100000 ? Math.round(amount * 100) / 100 : null;
}

export async function GET() {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;
  const [restaurants, settings] = await Promise.all([
    prisma.restaurant.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.platformSetting.findMany({ where: { OR: [{ key: PLATFORM_FEE_DEFAULT_KEY }, { key: { startsWith: "platform_fee_restaurant_" } }] } }),
  ]);
  const defaultRecord = settings.find((setting) => setting.key === PLATFORM_FEE_DEFAULT_KEY);
  const defaultFee = parseAmount((defaultRecord?.value as { amount?: unknown } | null)?.amount ?? defaultRecord?.value) ?? 0;
  const overrides = Object.fromEntries(settings.filter((setting) => setting.key.startsWith("platform_fee_restaurant_")).map((setting) => [setting.key.replace("platform_fee_restaurant_", ""), parseAmount((setting.value as { amount?: unknown })?.amount ?? setting.value) ?? 0]));
  return NextResponse.json({ success: true, data: { defaultFee, overrides, restaurants } });
}

export async function POST(request: Request) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;
  const body = await request.json();
  const amount = parseAmount(body.amount);
  const scope = body.scope === "restaurant" ? "restaurant" : "all";
  if (amount === null) return NextResponse.json({ success: false, error: "Enter a valid non-negative platform fee." }, { status: 400 });
  if (scope === "restaurant" && !body.restaurantId) return NextResponse.json({ success: false, error: "Select a restaurant." }, { status: 400 });
  if (scope === "restaurant" && !(await prisma.restaurant.findUnique({ where: { id: body.restaurantId }, select: { id: true } }))) return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  const key = scope === "restaurant" ? platformFeeRestaurantKey(body.restaurantId) : PLATFORM_FEE_DEFAULT_KEY;
  const setting = await prisma.platformSetting.upsert({
    where: { key }, update: { value: { amount }, description: scope === "all" ? "Default platform fee per order" : `Platform fee override for restaurant ${body.restaurantId}` },
    create: { key, value: { amount }, description: scope === "all" ? "Default platform fee per order" : `Platform fee override for restaurant ${body.restaurantId}` },
  });
  await createAuditLog({ actorId: session?.user?.id, actorEmail: session?.user?.email, actorRole: session?.user?.role, action: "UPDATE_PLATFORM_FEE", entity: "PlatformSetting", entityId: setting.id, metadata: { scope, restaurantId: body.restaurantId ?? null, amount } });
  return NextResponse.json({ success: true, data: { scope, restaurantId: body.restaurantId ?? null, amount } });
}
