import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google';        
import Providers from "./providers";
import ClientHydrate from "@/components/ClientHydrate";

export const metadata: Metadata = {
  title: "Secure Track - Admin CMS",
  description: "Government-grade secure tracking system for question paper delivery",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} antialiased`} suppressHydrationWarning={true}>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
          <Providers>
                {/* Client-side store rehydration */}
                 {/* <ClientHydrate /> */}
                 
              {children}
          </Providers>
      </body>
    </html>
  );
}
