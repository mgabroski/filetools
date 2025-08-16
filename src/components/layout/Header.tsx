import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 grid place-items-center rounded-xl bg-black text-white font-bold">
            FT
          </div>
          <span className="font-semibold">FileTools</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link className={linkCx(pathname === '/merge-pdf')} to="/merge-pdf">
            Merge PDF
          </Link>
          <Link className={linkCx(pathname === '/compress-pdf')} to="/compress-pdf">
            Compress PDF
          </Link>
          <Link className={linkCx(pathname === '/jpg-to-pdf')} to="/jpg-to-pdf">
            JPG → PDF
          </Link>
        </nav>
      </div>
    </header>
  );
}
function linkCx(active: boolean) {
  return `px-3 py-1.5 rounded-lg border ${active ? 'bg-black text-white border-black' : 'bg-white text-zinc-800 border-zinc-200'}`;
}
