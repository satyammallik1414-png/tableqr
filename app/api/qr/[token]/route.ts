import { NextResponse } from "next/server";
import { getQRDataByToken } from "@/lib/qr-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "QR token is required" },
        { status: 400 }
      );
    }

    const result = await getQRDataByToken(token);
    if (result.error || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "QR Code not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Fetch QR data error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load restaurant data" },
      { status: 500 }
    );
  }
}

