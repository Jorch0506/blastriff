import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 flex flex-col items-center gap-2 border-t border-border px-4 py-6 text-center text-xs text-text-muted">
      <div className="flex items-center gap-4">
        <Link href="/privacy" className="transition-colors hover:text-text">
          Privacy Policy
        </Link>
        <span className="text-border">|</span>
        <Link href="/terms" className="transition-colors hover:text-text">
          Terms of Service
        </Link>
      </div>
      <p>&copy; {new Date().getFullYear()} Blast Riff. All rights reserved.</p>
    </footer>
  );
}
