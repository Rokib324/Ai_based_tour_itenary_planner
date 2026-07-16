import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI-Based Smart Travel Planner",
  description: "Smart Travel Planning and Management System with Multi-Level Approval",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                if (!window.matchMedia) {
                  window.matchMedia = function(query) {
                    return {
                      matches: false,
                      media: query,
                      onchange: null,
                      addListener: function(cb) { this.addEventListener && this.addEventListener('change', cb); },
                      removeListener: function(cb) { this.removeEventListener && this.removeEventListener('change', cb); },
                      addEventListener: function(cb) { this.addEventListener('change', cb); },
                      removeEventListener: function(cb) { this.removeEventListener('change', cb); },
                      dispatchEvent: function() { return false; }
                    };
                  };
                } else {
                  const mql = window.matchMedia('(max-width: 0px)');
                  if (!mql.addListener) {
                    const originalMatchMedia = window.matchMedia;
                    window.matchMedia = function(query) {
                      const res = originalMatchMedia(query);
                      if (!res.addListener) {
                        res.addListener = function(cb) { this.addEventListener('change', cb); };
                      }
                      if (!res.removeListener) {
                        res.removeListener = function(cb) { this.removeEventListener('change', cb); };
                      }
                      return res;
                    };
                  }
                }
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
