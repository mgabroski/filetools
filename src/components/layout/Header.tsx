import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-4">
        {/* Top bar – се гледа само на ≥ sm */}
        <div className="h-9 hidden sm:flex items-center justify-end text-xs text-zinc-600">
        <nav className="flex items-center gap-4 [&>a:not(:last-child)]:after:content-['|'] [&>a:not(:last-child)]:after:ml-3 [&>a:not(:last-child)]:after:text-zinc-300">
  <Link to="/about" className="hover:text-blue-600 transition">About Us</Link>
  <Link to="/why-choose-us" className="hover:text-blue-600 transition">Why Choose Us</Link>
  <a href="/#faq" className="hover:text-blue-600 transition">FAQ</a>
</nav>

        </div>

        {/* Main row */}
        <div className="py-3 flex items-center justify-between relative border-t-1">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 grid place-items-center rounded-xl bg-black text-white font-bold">
              FT
            </div>
            <span className="font-semibold text-zinc-900">FileTools</span>
          </Link>

          {/* Desktop nav (центрирано) */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-3 text-sm">
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

          {/* Hamburger – се гледа само на мобилно */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Toggle navigation</span>
            <div className="space-y-0.5">
              <span
                className={`block h-[2px] w-5 rounded bg-zinc-800 transition-transform ${
                  isOpen ? 'translate-y-[3px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-[2px] w-5 rounded bg-zinc-800 transition-opacity ${
                  isOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`block h-[2px] w-5 rounded bg-zinc-800 transition-transform ${
                  isOpen ? '-translate-y-[3px] -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {isOpen && (
          <div className="md:hidden pb-3 border-t border-zinc-100">
            <nav className="pt-3 flex flex-col gap-2 text-sm text-zinc-800">
              {/* Anchor линкови */}
              <a
                href="/#pdf"
                className="px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50"
                onClick={() => setIsOpen(false)}
              >
                PDF Tools
              </a>
              <a
                href="/#image"
                className="px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50"
                onClick={() => setIsOpen(false)}
              >
                Image Tools
              </a>
              <a
                href="/#media"
                className="px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50"
                onClick={() => setIsOpen(false)}
              >
                Video &amp; Audio
              </a>

              <hr className="my-2 border-zinc-200" />

              {/* Страници од top bar исто во hamburger */}
              <Link
                to="/about"
                className="px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50"
                onClick={() => setIsOpen(false)}
              >
                About Us
              </Link>
              <Link
                to="/why-choose-us"
                className="px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50"
                onClick={() => setIsOpen(false)}
              >
                Why Choose Us
              </Link>
              <a
                href="/#faq"
                className="px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50"
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}