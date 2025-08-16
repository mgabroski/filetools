// src/pages/Home.tsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TOOL_GROUPS } from '../app/toolCatalog';
import type { ToolItem } from '../app/toolCatalog';
import type { ToolGroup } from '../app/toolCatalog';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { AdBox } from '../components/layout/AdBox';

const ToolCard = ({ item }: { item: ToolItem }) => {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
            <Icon className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{item.title}</div>
            <div className="text-sm text-zinc-500">{item.desc}</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-700 whitespace-nowrap">
            {item.pill}
          </span>
        </CardHeader>
        <CardContent>
          <div className="border border-dashed border-zinc-300 rounded-xl p-6 text-center">
            <p className="text-sm text-zinc-600 mb-3">
              {item.implemented ? 'Open the tool page' : 'Coming soon'}
            </p>
            {item.implemented ? (
              <Link
                to={item.to}
                className="inline-block px-3 py-2 rounded-lg bg-black text-white text-sm"
              >
                Open {item.title}
              </Link>
            ) : (
              <button
                disabled
                className="px-3 py-2 rounded-lg bg-zinc-200 text-zinc-600 text-sm cursor-not-allowed"
              >
                Coming soon
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Section = ({ meta, children }: { meta: ToolGroup; children: React.ReactNode }) => (
  <section className="mb-10">
    <div className="flex items-center gap-2 mb-4">
      <div
        className={`size-8 grid place-items-center rounded-xl bg-gradient-to-br ${meta.color} text-white`}
      >
        {React.createElement(meta.icon, { className: 'size-4' })}
      </div>
      <h2 className="text-xl font-semibold">{meta.label}</h2>
    </div>
    {children}
  </section>
);

export default function Home() {
  // Toggle between PDF-only and All tools
  const [mode, setMode] = useState<'all' | 'pdf'>('all');

  const groups = useMemo(() => {
    return mode === 'pdf' ? { pdf: TOOL_GROUPS.pdf } : TOOL_GROUPS;
  }, [mode]);

  return (
    <>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Free Online File Tools
        </h1>
        <p className="text-zinc-600 max-w-2xl mx-auto">
          Convert, compress, and merge files instantly. 100% private. Most tasks run{' '}
          <span className="font-medium">in your browser</span> — files never leave your device.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600">
          <span className="px-2 py-1 rounded-full bg-zinc-100">No login</span>
          <span className="px-2 py-1 rounded-full bg-zinc-100">Drag & drop</span>
          <span className="px-2 py-1 rounded-full bg-zinc-100">PWA offline</span>
          <span className="px-2 py-1 rounded-full bg-zinc-100">Privacy-first</span>
        </div>

        {/* Mode toggle */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setMode('pdf')}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              mode === 'pdf'
                ? 'bg-black text-white border-black'
                : 'bg-white text-zinc-800 border-zinc-200'
            }`}
          >
            PDF-only
          </button>
          <button
            onClick={() => setMode('all')}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              mode === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-zinc-800 border-zinc-200'
            }`}
          >
            All tools
          </button>
        </div>
      </motion.div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-10">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-10">
          {Object.entries(groups).map(([key, group]) => (
            <Section key={key} meta={group}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {group.items.map((it) => (
                  <ToolCard key={it.key} item={it} />
                ))}
              </div>
            </Section>
          ))}
        </div>

        {/* Sidebar (ads + trust) */}
        <div className="space-y-4">
          <AdBox />
          <AdBox />
          <Card>
            <CardHeader>
              <div className="font-semibold">Why FileTools?</div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-2">
                <li>Private: most actions run locally via WebAssembly.</li>
                <li>No tracking of file contents. Ever.</li>
                <li>Clean UI, mobile-first, no popups.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ / SEO */}
      <div className="mt-12">
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">Frequently Asked Questions</div>
          </CardHeader>
          <CardContent className="text-sm text-zinc-700 space-y-4">
            <div>
              <div className="font-medium">Are my files uploaded?</div>
              <p>
                For most tools, processing happens in your browser using WebAssembly. That means
                your files never leave your device. Some conversions (like DOCX→PDF) may require a
                server—those are clearly labeled.
              </p>
            </div>
            <div>
              <div className="font-medium">Is it free?</div>
              <p>
                Yes. Core tools are free and supported by privacy-respecting ads. Heavy/batch tasks
                may offer an optional Pro mode with higher limits.
              </p>
            </div>
            <div>
              <div className="font-medium">Which browsers are supported?</div>
              <p>
                Latest Chrome, Edge, Firefox, and Safari on desktop & mobile. No extensions
                required.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
