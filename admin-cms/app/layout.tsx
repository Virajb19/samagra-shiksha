import type { Metadata } from "next";
import "./globals.css";
import { Inter, Lato } from 'next/font/google';        
import Providers from "./providers";

export const metadata: Metadata = {
  title: "NITI Technologies",
  description: "Government-grade secure tracking system for question paper delivery",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
  weight: ["400", "700", "300"],
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
              {children}
          </Providers>
      </body>
    </html>
  );
}
