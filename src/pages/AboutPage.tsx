// src/pages/AboutPage.tsx

import { SeoHead } from '../components/seo/SeoHead';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Shield, Zap, Globe2 } from 'lucide-react';

const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) || 'https://filetools-eight.vercel.app';

export default function AboutPage() {
  const faq = [
    {
      q: 'Do you store my files?',
      a: 'Most tools run in your browser using WebAssembly, so your files stay on your device. Some conversions may contact a server, and those are clearly labeled.',
    },
    {
      q: 'Is FileTools free to use?',
      a: 'Yes. The core tools are free. In the future, heavy or batch workflows may offer an optional Pro mode with higher limits.',
    },
    {
      q: 'Which platforms are supported?',
      a: 'FileTools works in modern desktop and mobile browsers — no extensions or installs required.',
    },
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About FileTools',
      description:
        'Learn more about FileTools: a small, privacy-first toolbox for PDFs, images and videos. No sign-up, no file tracking, processing happens in your browser.',
      url: `${SITE_URL}/about`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: a,
        },
      })),
    },
  ];

  return (
    <>
      <SeoHead
        title="About FileTools — Private, Fast Online File Tools"
        description="Learn more about FileTools: a small, privacy-first toolbox for PDFs, images and videos. No sign-up, no file tracking, processing happens in your browser."
        path="/about"
        type="website"
        keywords="about FileTools, file tools privacy, online pdf tools, image tools, video tools, no sign-up, in-browser processing"
        jsonLd={jsonLd}
      />

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Hero / intro */}
        <section className="space-y-4 text-center">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            About FileTools
          </div> */}

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            A tiny toolbox for everyday file chores
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto">
            FileTools helps you quickly merge PDFs, compress images, tweak videos and more — without
            logins, bloated dashboards, or sending every file to the cloud. Just open a tool, drop a
            file, and you&apos;re done.
          </p>
        </section>

        {/* 3-column highlights */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 flex flex-col gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Shield className="h-4 w-4" />
            </div>
            <div className="font-semibold text-zinc-900">Privacy-first</div>
            <p className="text-xs text-zinc-600">
              Most tools run fully in your browser. That means no accounts, no file history, and no
              server-side processing for typical tasks.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 flex flex-col gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Zap className="h-4 w-4" />
            </div>
            <div className="font-semibold text-zinc-900">Fast & focused</div>
            <p className="text-xs text-zinc-600">
              No complex dashboard — each tool opens directly with the options you actually need,
              optimized for quick, repeatable workflows.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 flex flex-col gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Globe2 className="h-4 w-4" />
            </div>
            <div className="font-semibold text-zinc-900">Works everywhere</div>
            <p className="text-xs text-zinc-600">
              Built for modern desktop and mobile browsers. No extensions or installs — just visit
              the site and start using a tool.
            </p>
          </div>
        </section>

        {/* What makes it different */}
        <Card className="rounded-2xl border border-zinc-200 bg-white">
          <CardHeader className="pb-2 pt-4">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
              What makes FileTools different?
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-700">
            <p>
              Many online converters and editors require accounts, upload every file to a remote
              server, or drown you in ads. FileTools takes a different approach: most tools run
              locally in your browser using technologies like WebAssembly, so your files stay with
              you.
            </p>

            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <span className="font-medium">Private by design.</span> No file content tracking, no
                login, and for most tools no uploads at all.
              </li>
              <li>
                <span className="font-medium">Small, focused tools.</span> Each tool does one thing
                well — merge, compress, convert — without extra clutter.
              </li>
              <li>
                <span className="font-medium">Friendly on slower networks.</span> Local processing
                means fewer large uploads and faster results.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Philosophy / roadmap */}
        <Card className="rounded-2xl border border-zinc-200 bg-white">
          <CardHeader className="pb-2 pt-4">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
              Philosophy & roadmap
            </h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-700">
            <p>
              The philosophy behind FileTools is simple: give people a small set of tools they can
              trust and come back to every day, without dark patterns or surprise subscriptions.
            </p>
            <p>Some of the things planned for the future include:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Additional PDF tools (sign, fill forms, redact sensitive content)</li>
              <li>Batch image and video workflows for power users</li>
              <li>Presets for email, web, and social media file sizes</li>
            </ul>
            <p className="text-xs text-zinc-500">
              If there&apos;s a tool you&apos;d love to see, you&apos;re welcome to suggest it.
              FileTools is intentionally small and will grow based on what people actually use.
            </p>
          </CardContent>
        </Card>

        {/* Mini FAQ (matches JSON-LD content) */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
            Frequently asked questions
          </h2>
          <div className="space-y-4 text-sm text-zinc-700">
            {faq.map((item) => (
              <div key={item.q} className="space-y-1.5">
                <div className="font-medium text-zinc-900">{item.q}</div>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
