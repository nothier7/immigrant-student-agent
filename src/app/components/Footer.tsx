export default function Footer() {
  return (
    <footer className="border-t border-black/5 dark:border-white/10 mt-8">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-neutral-500 flex flex-col md:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} Dreamers Agent</p>
        <div className="flex items-center gap-4">
          <a className="hover:text-neutral-700 dark:hover:text-neutral-300" href="#">Privacy</a>
          <a className="hover:text-neutral-700 dark:hover:text-neutral-300" href="#">Terms</a>
          <a className="hover:text-neutral-700 dark:hover:text-neutral-300" href="#">Contact</a>
        </div>
      </div>
    </footer>
  );
}
