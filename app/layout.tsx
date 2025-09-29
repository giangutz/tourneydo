import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from '@clerk/nextjs';
import { ClientSideRouter } from "@/components/auth/client-side-router";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "TourneyDo - Tournament Management Made Simple",
  description: "Streamline martial arts tournaments with automated brackets, QR check-ins, real-time results, and comprehensive reporting. Built for organizers and coaches.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.className} antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ClientSideRouter />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
