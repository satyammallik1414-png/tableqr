import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "SmartServe AI - Restaurant Management System",
    template: "%s | SmartServe AI",
  },
  description:
    "AI-powered restaurant & cafe management system with QR ordering, kitchen display, billing, and analytics.",
  keywords: [
    "restaurant management",
    "QR menu",
    "kitchen display",
    "billing system",
    "cafe management",
    "SmartServe AI",
  ],
  authors: [{ name: "SmartServe AI" }],
  manifest: "/manifest.json",
  applicationName: "SmartServe AI",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SmartServe" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }, { url: "/icons/icon-512.png", sizes: "512x512" }], apple: "/icons/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "SmartServe AI",
    title: "SmartServe AI - Restaurant Management System",
    description:
      "AI-powered restaurant & cafe management system with QR ordering, kitchen display, and billing.",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${poppins.variable}`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
