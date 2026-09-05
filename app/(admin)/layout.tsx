import { auth } from "@/lib/auth";
import { getEffectiveFeaturesMap, ALL_FEATURE_KEYS } from "@/lib/features";
import { Sidebar } from "@/components/admin/Sidebar";
import { PermissionProvider } from "@/components/shared/PermissionProvider";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let initialFeatures: Record<string, boolean> | null = null;

  if (session?.user) {
    const role = (session.user.role ?? "").toUpperCase();
    if (role === "SUPERADMIN" || role === "SUPER_ADMIN") {
      const fullAccess = {} as Record<string, boolean>;
      for (const key of ALL_FEATURE_KEYS) {
        fullAccess[key] = true;
      }
      initialFeatures = fullAccess;
    } else {
      const userId = session.user.id;
      const businessId = session.user.restaurantId;
      initialFeatures = await getEffectiveFeaturesMap(userId, businessId);
    }
  }

  return (
    <PermissionProvider initialFeatures={initialFeatures}>
      <div className="flex min-h-screen">
        <Sidebar initialFeatures={initialFeatures} />
        <MobileBottomNav kind="admin" />
        <main className="min-w-0 flex-1 overflow-x-hidden pb-20 lg:ml-64 lg:pb-0">
          <div className="min-h-screen bg-white p-3 sm:p-4 lg:p-6">
            <div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div>
          </div>
        </main>
      </div>
    </PermissionProvider>
  );
}
