import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Workforce Nexus - 勤怠管理",
  description: "マルチテナント対応の勤怠管理システム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Workforce Nexus",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
