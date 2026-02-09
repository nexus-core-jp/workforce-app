import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workforce - \u52e4\u6020\u7ba1\u7406\u30b7\u30b9\u30c6\u30e0",
  description: "\u6253\u523b\u30fb\u52e4\u6020\u5c65\u6b74\u30fb\u4fee\u6b63\u7533\u8acb\u3092\u4e00\u5143\u7ba1\u7406",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
