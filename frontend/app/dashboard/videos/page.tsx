"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  PENDING:    { dot: "bg-yellow-400", text: "text-yellow-400", label: "Pending" },
  PROCESSING: { dot: "bg-blue-400 animate-pulse", text: "text-blue-400", label: "Memproses" },
  COMPLETED:  { dot: "bg-green-400", text: "text-green-400", label: "Selesai" },
  FAILED:     { dot: "bg-red-400", text: "text-red-400", label: "Gagal" },
};

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/videos?page=${page}&size=20`).then(({ data }) => {
      setVideos(data.items);
      setTotal(data.total);
    });
  }, [page]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/videos/${id}`);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      setTotal((t) => t - 1);
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  }

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Video</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} video tersimpan</p>
        </div>
        <a
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Upload Video
        </a>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama File</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plat</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upload</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>
                    </svg>
                    <p>Belum ada video</p>
                  </div>
                </td>
              </tr>
            )}
            {videos.map((v) => {
              const s = STATUS_STYLE[v.status] ?? STATUS_STYLE.PENDING;
              return (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground truncate max-w-xs block">{v.original_filename}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-foreground font-semibold">{v.total_plates ?? "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">{new Date(v.uploaded_at).toLocaleString("id-ID")}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={`/dashboard/videos/${v.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        Detail
                      </a>
                      {confirmId === v.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(v.id)}
                            disabled={deleting === v.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive text-white hover:bg-destructive/80 transition-colors disabled:opacity-50"
                          >
                            {deleting === v.id ? "..." : "Hapus"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(v.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Hapus video"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Halaman {page} dari {totalPages} &middot; {total} total video
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
    </div>
  );
}
