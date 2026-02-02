import type { Metadata } from "next";
import { Inter } from "next/font/google"; // or Geist if default
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smider - AI Handverkertjenester",
  description: "Få jobben gjort med AI-presisjon.",
};

import { Navbar } from "@/components/navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen flex-col items-center">
            <Navbar />
            <div className="w-full max-w-7xl">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
