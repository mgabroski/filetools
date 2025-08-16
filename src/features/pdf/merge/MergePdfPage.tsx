import { useMemo, useState } from 'react';
import { mergePdf } from './mergePdf';
import { downloadBlob } from '../../../utils/download';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';

type Picked = { file: File; id: string };

export default function MergePdfPage() {
  const [files, setFiles] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const canMerge = files.length >= 2 && !busy;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter((f) => f.type === 'application/pdf');
    const mapped = selected.map((f) => ({ file: f, id: crypto.randomUUID() }));
    setFiles((prev) => [...prev, ...mapped]);
    e.currentTarget.value = '';
  }

  function remove(id: string) {
    setFiles((prev) => prev.filter((p) => p.id !== id));
  }

  async function onMerge() {
    try {
      setBusy(true);
      const blob = await mergePdf(files.map((f) => f.file));
      downloadBlob(blob, 'merged.pdf');
    } catch (err) {
      console.error(err);
      alert('Failed to merge PDFs. Please try smaller files or fewer at once.');
    } finally {
      setBusy(false);
    }
  }

  const totalSize = useMemo(() => files.reduce((sum, p) => sum + p.file.size, 0), [files]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Merge PDF</h1>
      <p className="text-sm text-zinc-600">
        Combine multiple PDFs into one. Processing happens in your browser—files never leave your
        device.
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Your PDFs</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-sm cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={onPick}
              />
              Add PDFs
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="border border-dashed border-zinc-300 rounded-xl p-6 text-center text-sm text-zinc-600">
              Drop or pick two or more PDFs to merge.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {files.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between">
                  <div className="truncate">{p.file.name}</div>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-xs px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              Files: {files.length} • Total: {(totalSize / (1024 * 1024)).toFixed(2)} MB
            </div>
            <button
              onClick={onMerge}
              disabled={!canMerge}
              className={`px-4 py-2 rounded-lg text-sm ${
                canMerge ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {busy ? 'Merging…' : 'Merge PDFs'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
