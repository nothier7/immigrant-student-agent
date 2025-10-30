import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-[color:rgb(var(--glass-border)/0.12)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-text/70 md:flex-row">
        <p>© {new Date().getFullYear()} Dreamers Agent</p>
        <div className="flex items-center gap-4">
          <Link className="hover:text-heading/80" href="#">Privacy</Link>
          <Link className="hover:text-heading/80" href="#">Terms</Link>
          <Link className="hover:text-heading/80" href="#">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
