// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/sections/Header";
import "devextreme/dist/css/dx.light.css";
import ReduxWrapper from "@/lib/redux/ReduxWrapper";
import ProfileWrapper from "@/lib/ProfileWrapper";
import { Suspense } from "react";
import { Toaster } from "sonner";
import Footer from "@/components/Footer";
import BeforeUnloadPrompt from "@/components/BeforeUnloadPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Powersoft - AI SEO Generator for E-commerce",
  description:
    "Generate optimized SEO titles, descriptions & meta tags for thousands of products in minutes. AI-powered. Export to CSV, Excel, JSON.",
  metadataBase: new URL("https://powersoft.vercel.app"),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en-US",
      // Add other language routes if you support them
      // "es-ES": "/es-ES",
      // "fr-FR": "/fr-FR",
    },
  },
  openGraph: {
    images: [
      "/og-image.png", // or your Cloudinary URL
    ],
    title: "Powersoft - AI SEO Generator for E-commerce",
    description:
      "AI-powered SEO content generation for e-commerce products. Bulk optimize titles, descriptions, and meta tags.",
    url: "https://powersoft.vercel.app",
    siteName: "Powersoft",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Powersoft - AI SEO Generator for E-commerce",
    description:
      "Generate optimized SEO content for thousands of products in minutes. AI-powered titles, descriptions, and meta tags.",
    images: ["/og-image.png"],
    creator: "@Powersoft_ai",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/* suppressHydrationWarning prevents dev-only/body-level attr mismatches from throwing warnings */}
      <body
        suppressHydrationWarning={true}
        className={`antialiased bg-white ${geistSans.variable} ${geistMono.variable}`}
      >
        {/* Provide a stable fallback to avoid transient mismatches in dev */}
        <Suspense fallback={null}>
          <Toaster />
          <ReduxWrapper>
            <ProfileWrapper>
              <Header />
              <div className="container min-h-screen mx-auto py-12  lg:px-6 2xl:px-2 max-sm:p-2">
                {children}
              </div>
              <Footer />
            </ProfileWrapper>
          </ReduxWrapper>
        </Suspense>
      </body>
    </html>
  );
}
