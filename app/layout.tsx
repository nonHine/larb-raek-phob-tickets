import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { EVENT } from "@/config/event.config";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${EVENT.name} | ซื้อบัตรเข้างาน`,
  description: `ซื้อบัตรเข้างาน ${EVENT.name} ${EVENT.venue} ราคา ${EVENT.ticketPriceThb} บาท`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className="min-h-screen bg-surface-subtle text-content antialiased flex flex-col items-center">
        <main className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl min-h-screen bg-surface flex flex-col shadow-sm sm:border-x sm:border-border transition-all">
          {children}
        </main>
      </body>
    </html>
  );
}
