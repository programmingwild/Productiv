import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Productiv - Project Management SaaS",
  description: "Manage your projects, collaborate with your team, and ship faster.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "var(--nb-bg)" }}>
          <style id="nb-theme-vars">{`
            :root {
              --nb-bg: #f5f0eb;
              --nb-surface: #fff;
              --nb-surface-soft: #fafaf5;
              --nb-text: #1a1a1a;
              --nb-text-soft: #666;
              --nb-border: #1a1a1a;
              --nb-shadow: rgba(0, 0, 0, 0.85);
              --nb-yellow: #f7d44a;
              --nb-coral: #e85d75;
              --nb-mint: #4ecdc4;
              --nb-on-accent: #1a1a1a;
            }
            [data-theme="dark"] {
              --nb-bg: #0f0f15;
              --nb-surface: #1a1a22;
              --nb-surface-soft: #14141c;
              --nb-text: #e8e8ee;
              --nb-text-soft: #8888a0;
              --nb-border: #000;
              --nb-shadow: rgba(0, 0, 0, 0.6);
              --nb-yellow: #f7d44a;
              --nb-coral: #ff6b85;
              --nb-mint: #5eddd4;
              --nb-on-accent: #1a1a1a;
            }
          `}</style>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
