import { Outlet } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 text-zinc-900">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
