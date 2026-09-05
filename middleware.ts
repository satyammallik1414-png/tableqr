import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  const isRoot = pathname === "/";
  const publicPrefixes = ["/login", "/register", "/api/auth", "/order"];
  const isPublic = isRoot || publicPrefixes.some((p) => pathname.startsWith(p));
  const isCustomerMenu = pathname.startsWith("/menu/") || pathname.startsWith("/order");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublicQrApi = pathname.startsWith("/api/qr/") && !pathname.startsWith("/api/qr/generate") && !pathname.startsWith("/api/qr/manage");
  const isPublicOrderSubmit = pathname === "/api/order/submit";
  const isPublicOrderStatus = pathname.startsWith("/api/order/") && pathname.endsWith("/status") && req.method === "GET";
  const isPublicOrderCancel = pathname.startsWith("/api/order/") && pathname.endsWith("/cancel") && req.method === "POST";
  const isApiRoute = pathname.startsWith("/api/");

  if (isCustomerMenu || isAuthApi || isPublicQrApi || isPublicOrderSubmit || isPublicOrderStatus || isPublicOrderCancel) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session) {
    const userEmail = session.user?.email?.toLowerCase();
    const isSuperAdmin =
      ["SUPERADMIN", "SUPER_ADMIN"].includes((role ?? "").toUpperCase()) ||
      userEmail === "satyammallik1414@gmail.com" ||
      userEmail === "superadmin@smartserve.ai";

    // Auto-open super admin panel when superadmin (e.g. satyammallik1414@gmail.com) visits home or auth pages
    if (isSuperAdmin && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/super-admin", req.url));
    }

    if (pathname.startsWith("/super-admin") && !isSuperAdmin) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("error", "SuperAdminRequired");
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/kitchen") && role !== "KITCHEN") {
      return NextResponse.redirect(new URL(isSuperAdmin ? "/super-admin" : "/admin/dashboard", req.url));
    }
    if (pathname.startsWith("/counter") && !["CASHIER", "MANAGER", "ADMIN"].includes(role ?? "")) {
      return NextResponse.redirect(new URL(isSuperAdmin ? "/super-admin" : "/admin/dashboard", req.url));
    }
    if (pathname.startsWith("/admin") && !["SUPERADMIN", "SUPER_ADMIN", "ADMIN", "MANAGER"].includes((role ?? "").toUpperCase())) {
      if (role === "KITCHEN") return NextResponse.redirect(new URL("/kitchen", req.url));
      if (role === "CASHIER") return NextResponse.redirect(new URL("/counter", req.url));
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icons.svg|images/).*)",
  ],
};
