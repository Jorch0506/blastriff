import Link from "next/link";
import { Footer } from "@/components/layout/Footer";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <Link href="/" className="font-metal text-lg text-primary">
          BLAST⚡RIFF
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-metal text-3xl text-text sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: {lastUpdated}</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-text-muted [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-gold-dim [&_h2]:mt-2 [&_h2]:font-metal [&_h2]:text-xl [&_h2]:tracking-wide [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_p]:text-text-muted [&_strong]:text-text [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
