import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AdA Player — Interfaz para el motor mpv",
  description:
    "Interfaz de usuario moderna, personalizable y configurable para el motor de reproducción mpv. Control total vía JSON IPC: pistas, capítulos, cola, subtítulos y pipeline de vídeo/audio.",
  keywords: ["mpv", "reproductor", "video", "media player", "AdA", "interfaz", "IPC"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <Sonner position="bottom-right" richColors closeButton theme="dark" />
      </body>
    </html>
  );
}
