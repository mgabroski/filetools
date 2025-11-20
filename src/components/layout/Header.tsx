import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 grid place-items-center rounded-xl bg-black text-white font-bold">
            FT
          </div>
          <span className="font-semibold">FileTools</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <a
            href="/#pdf"
            className="px-3 py-1.5 rounded-lg border bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
          >
            PDF Tools
          </a>
          <a
            href="/#image"
            className="px-3 py-1.5 rounded-lg border bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
          >
            Image Tools
          </a>
          <a
            href="/#media"
            className="px-3 py-1.5 rounded-lg border bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
          >
            Video &amp; Audio
          </a>
        </nav>
      </div>
    </header>
  );
}
