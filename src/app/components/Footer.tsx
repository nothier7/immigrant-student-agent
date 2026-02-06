import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-[color:rgb(var(--glass-border)/0.12)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-text/70 md:flex-row">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <p>© {new Date().getFullYear()} Dreamers Agent</p>
          <p className="text-[11px] text-text/60">Informational guidance only. Verify with official sources.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link className="hover:text-heading/80" href="/privacy">Privacy</Link>
          <Link className="hover:text-heading/80" href="/terms">Terms</Link>
          <Link className="hover:text-heading/80" href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
