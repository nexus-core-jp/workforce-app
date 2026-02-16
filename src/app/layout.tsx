import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workforce - 勤怠管理",
  description: "マルチテナント勤怠管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
