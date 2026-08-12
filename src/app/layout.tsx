import type { Metadata } from "next";
import { Inter, Metal_Mania } from "next/font/google";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const metalMania = Metal_Mania({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-metal-mania",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLAST RIFF — Prove You're Trve",
  description:
    "Blast Riff is the global heavy metal trivia game. Answer riffs, lore, and lyrics questions, climb the leaderboard, and prove you're a trve metalhead.",
  openGraph: {
    title: "BLAST RIFF — Prove You're Trve",
    description:
      "The global heavy metal trivia game. Climb the leaderboard and prove you're a trve metalhead.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${metalMania.variable}`}>
      <body className="bg-background font-sans text-text antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
