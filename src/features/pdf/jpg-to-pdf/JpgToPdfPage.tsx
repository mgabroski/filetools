import { Card, CardContent, CardHeader } from '../../../components/ui/Card';

export default function JpgToPdfPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">JPG → PDF</h1>
      <p className="text-sm text-zinc-600">
        Convert images into a single PDF. Client-side implementation coming next.
      </p>
      <Card>
        <CardHeader>
          <div className="font-semibold">Upload</div>
        </CardHeader>
        <CardContent>
          <div className="border border-dashed border-zinc-300 rounded-xl p-6 text-center text-sm text-zinc-600">
            Coming soon. This page is here so routing and imports work.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
