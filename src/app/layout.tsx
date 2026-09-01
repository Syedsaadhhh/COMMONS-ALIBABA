import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function getMetadataBase(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const candidate =
    configuredUrl ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");

  try {
    return new URL(candidate);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "COMMONS: Civic work people can trust",
    template: "%s | COMMONS",
  },
  description:
    "Turn public problems into coordinated projects with sourced measurements, reviewable evidence, and visible uncertainty.",
  openGraph: {
    type: "website",
    title: "COMMONS: Civic work people can trust",
    description:
      "From public problem to coordinated work, sourced measurement, and reviewable proof.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "COMMONS: Civic work people can trust",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "COMMONS: Civic work people can trust",
    description:
      "From public problem to coordinated work, sourced measurement, and reviewable proof.",
    images: ["/og.jpg"],
  },
};

const themeInitializer = `
  (function () {
    try {
      var saved = localStorage.getItem("commons-theme");
      var preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = saved === "dark" || saved === "light" ? saved : preferred;
    } catch (_) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body className="min-h-full">
        <div className="site-frame">
          <SiteHeader />
          <div className="site-content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
