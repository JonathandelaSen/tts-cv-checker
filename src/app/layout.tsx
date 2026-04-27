import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CV ATS Checker — Analiza tu Currículum",
  description:
    "Extrae y analiza el texto de tu CV con múltiples parsers y tecnología IA para optimizar tu currículum para sistemas ATS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased dark`}>
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}
