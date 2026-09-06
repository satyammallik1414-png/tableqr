import { prisma } from "@/lib/prisma";

export const PLATFORM_FEE_DEFAULT_KEY = "platform_fee_default";
export const platformFeeRestaurantKey = (restaurantId: string) => `platform_fee_restaurant_${restaurantId}`;

function feeValue(value: unknown): number | null {
  const raw = typeof value === "object" && value !== null && "amount" in value
    ? (value as { amount?: unknown }).amount
    : value;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
}

export async function getPlatformFee(restaurantId?: string | null): Promise<number> {
  const keys = restaurantId
    ? [platformFeeRestaurantKey(restaurantId), PLATFORM_FEE_DEFAULT_KEY]
    : [PLATFORM_FEE_DEFAULT_KEY];
  const records = await prisma.platformSetting.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(records.map((record) => [record.key, record.value]));
  if (restaurantId) {
    const override = feeValue(byKey.get(platformFeeRestaurantKey(restaurantId)));
    if (override !== null) return override;
  }
  return feeValue(byKey.get(PLATFORM_FEE_DEFAULT_KEY)) ?? 0;
}
