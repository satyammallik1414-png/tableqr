import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Socket.IO server is running on the main HTTP server",
  });
}
