import type { Metadata } from "next";
import { Cormorant_Garamond, Lato, Amiri } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Soufi Studio — Le patrimoine spirituel des grands maîtres",
    template: "%s · Soufi Studio",
  },
  description:
    "Bibliothèque vivante de la sagesse soufie : Rûmî, Ibn ʿArabî, Ghazâlî, Tustarî et les grands maîtres de la tradition islamique, en français.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Soufi Studio",
    images: [
      {
        url: "/og?title=Soufi%20Studio&subtitle=Le%20patrimoine%20spirituel%20des%20grands%20ma%C3%AEtres",
        width: 1200,
        height: 630,
        alt: "Soufi Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      "/og?title=Soufi%20Studio&subtitle=Le%20patrimoine%20spirituel%20des%20grands%20ma%C3%AEtres",
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${lato.variable} ${amiri.variable}`}>
      <body className="min-h-screen bg-parchment font-body text-navy-700 antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
