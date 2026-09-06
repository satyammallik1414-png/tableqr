import { CustomerMenu } from "@/components/order/CustomerMenu";
import { getQRDataByToken } from "@/lib/qr-data";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function TableQRPage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/customer/register?callbackUrl=${encodeURIComponent(`/order/table/${token}`)}`);
  const result = await getQRDataByToken(token);

  if (result.error || !result.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-800 font-sans">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-navy-900">Table QR Unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">
            {result.error || "This Table QR code is inactive or invalid. Please request staff assistance."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <a href={`/order/table/${token}`}>
              <Button className="w-full bg-navy-900 hover:bg-navy-800 text-white gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { qr, restaurant, branch, table, categories, paymentSettings, taxSettings } = result.data;

  return (
    <CustomerMenu
      qrData={qr}
      restaurant={restaurant}
      branch={branch}
      table={table}
      categories={categories}
      paymentSettings={paymentSettings}
      taxSettings={taxSettings}
    />
  );
}
