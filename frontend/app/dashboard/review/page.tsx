"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

type ReviewItem = {
  id: string;
  video_id: string;
  raw_plate: string;
  confidence: number;
  image_crop_url: string | null;
  status: string;
  created_at: string;
};

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 60 ? "text-yellow-400" : "text-orange-400";
  return <span className={`font-semibold ${color}`}>{pct}%</span>;
}

function ReviewRow({
  item,
  onDone,
}: {
  item: ReviewItem;
  onDone: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [correctedPlate, setCorrectedPlate] = useState(item.raw_plate);
  const [loading, setLoading] = useState<"approve" | "correct" | "reject" | null>(null);

  async function handleApprove() {
    setLoading("approve");
    try {
      await api.post(`/review/queue/${item.id}/approve`);
      onDone(item.id);
    } finally {
      setLoading(null);
    }
  }

  async function handleCorrect() {
    if (!correctedPlate.trim()) return;
    setLoading("correct");
    try {
      await api.post(`/review/queue/${item.id}/correct`, { corrected_plate: correctedPlate.trim().toUpperCase() });
      onDone(item.id);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      await api.post(`/review/queue/${item.id}/reject`);
      onDone(item.id);
    } finally {
      setLoading(null);
    }
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors align-top">
      {/* Crop image */}
      <td className="px-5 py-4 w-40">
        {item.image_crop_url ? (
          <img
            src={item.image_crop_url}
            alt={item.raw_plate}
            className="w-36 h-20 object-cover rounded-lg border border-border"
          />
        ) : (
          <div className="w-36 h-20 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </td>

      {/* Plate + confidence */}
      <td className="px-5 py-4">
        <p className="font-mono font-bold text-lg text-foreground tracking-widest">{item.raw_plate}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Confidence: <ConfidenceBadge value={item.confidence} />
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(item.created_at).toLocaleString("id-ID")}
        </p>
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        {editing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={correctedPlate}
              onChange={(e) => setCorrectedPlate(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 font-mono text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nomor plat benar"
              onKeyDown={(e) => e.key === "Enter" && handleCorrect()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCorrect}
                disabled={loading === "correct"}
                className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading === "correct" ? "..." : "Simpan"}
              </button>
              <button
                onClick={() => { setEditing(false); setCorrectedPlate(item.raw_plate); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleApprove}
              disabled={!!loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50 transition-colors"
            >
              {loading === "approve" ? "..." : "✓ Benar"}
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={!!loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 disabled:opacity-50 transition-colors"
            >
              ✎ Koreksi
            </button>
            <button
              onClick={handleReject}
              disabled={!!loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
            >
              {loading === "reject" ? "..." : "✕ Buang"}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const SIZE = 20;

  useEffect(() => {
    setLoading(true);
    api.get(`/review/queue?page=${page}&size=${SIZE}`).then(({ data }) => {
      setItems(data.items);
      setTotal(data.total);
    }).finally(() => setLoading(false));
  }, [page]);

  function handleDone(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  async function handleExport() {
    const res = await api.get("/review/export", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "labeled_dataset.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / SIZE) || 1;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Antrian Review</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} deteksi menunggu review
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Export Dataset CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Foto Kendaraan</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plat Terdeteksi</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center text-muted-foreground">
                  Memuat...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <p>Tidak ada antrian review</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && items.map((item) => (
              <ReviewRow key={item.id} item={item} onDone={handleDone} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages} &middot; {total} total item
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
