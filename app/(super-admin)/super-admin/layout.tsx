import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSuperAdminRole } from "@/lib/auth-helpers";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";
import { SuperAdminHeader } from "@/components/super-admin/SuperAdminHeader";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !isSuperAdminRole(session.user.role)) {
    redirect("/login?callbackUrl=/super-admin");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SuperAdminSidebar />
      <MobileBottomNav kind="super-admin" />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64 transition-all duration-300">
        <SuperAdminHeader />
        <main className="min-w-0 flex-1 p-3 pb-20 sm:p-4 lg:p-8 lg:pb-8"><div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div></main>
      </div>
    </div>
  );
}
