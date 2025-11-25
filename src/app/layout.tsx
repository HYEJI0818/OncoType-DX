import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EnhancedTranslationProvider } from "@/contexts/EnhancedTranslationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OncoType DX 유방암 분석 대시보드 | OncoType DX Breast Cancer Analysis",
  description: "AI 기반 OncoType DX 유방암 분석 및 진단 대시보드 - OncoType DX Breast Cancer Analysis Dashboard",
  keywords: ["MRI", "유방암", "breast cancer", "oncotype dx", "의료 영상", "medical imaging", "AI 진단", "AI diagnosis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AuthErrorBoundary>
            <EnhancedTranslationProvider>
              {children}
            </EnhancedTranslationProvider>
          </AuthErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
