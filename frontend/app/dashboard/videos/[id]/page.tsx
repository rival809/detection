"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Lightbox from "@/components/lightbox";

const TAX_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ACTIVE:    { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400",  label: "Patuh" },
  EXPIRED:   { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400",    label: "Menunggak" },
  NOT_FOUND: { bg: "bg-muted",         text: "text-muted-foreground", dot: "bg-muted-foreground", label: "Tidak Ditemukan" },
  ERROR:     { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400", label: "Error" },
};

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  PENDING:    { color: "text-yellow-400", label: "Pending" },
  PROCESSING: { color: "text-blue-400",   label: "Memproses" },
  COMPLETED:  { color: "text-green-400",  label: "Selesai" },
  FAILED:     { color: "text-red-400",    label: "Gagal" },
};

interface Progress { stage: string; percent: number; message: string }

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctValue, setCorrectValue] = useState<Record<string, string>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api.get(`/videos/${id}`).then(({ data }) => setVideo(data));
    api.get(`/videos/${id}/detections`).then(({ data }) => setDetections(data.items));
  }, [id]);

  useEffect(() => {
    if (!video) return;
    if (video.status === "PROCESSING" || video.status === "PENDING") {
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/videos/${id}/progress`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const p: Progress = JSON.parse(e.data);
        setProgress(p);
        if (p.stage === "completed" || p.stage === "failed") {
          api.get(`/videos/${id}`).then(({ data }) => setVideo(data));
          api.get(`/videos/${id}/detections`).then(({ data }) => setDetections(data.items));
          ws.close();
        }
      };
      return () => ws.close();
    }
  }, [video?.status]);

  async function recheck(detectionId: string) {
    setRecheckingId(detectionId);
    try {
      const { data } = await api.post(`/videos/${id}/detections/${detectionId}/recheck`);
      setDetections((prev) => prev.map((d) => (d.id === detectionId ? data : d)));
    } finally {
      setRecheckingId(null);
    }
  }

  async function correctDetection(detectionId: string) {
    const plate = correctValue[detectionId]?.trim().toUpperCase();
    if (!plate) return;
    setRecheckingId(detectionId);
    try {
      await api.post(`/videos/${id}/detections/${detectionId}/correct`, { corrected_plate: plate });
      setDetections((prev) => prev.map((d) => d.id === detectionId ? { ...d, plate_number: plate } : d));
      setCorrectingId(null);
    } finally {
      setRecheckingId(null);
    }
  }

  async function deleteDetection(detectionId: string) {
    setDeletingId(detectionId);
    try {
      await api.delete(`/videos/${id}/detections/${detectionId}`);
      setDetections((prev) => prev.filter((d) => d.id !== detectionId));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function exportCSV() {
    const header = "Plat Nomor,Confidence,Status Pajak\n";
    const rows = detections.map((d) => `${d.plate_number},${(d.confidence * 100).toFixed(1)}%,${d.tax_status}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `deteksi-${id}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!video) return (
    <div className="p-4 md:p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-card rounded-lg w-64" />
      <div className="h-4 bg-card rounded w-48" />
      <div className="h-64 bg-card rounded-xl" />
    </div>
  );

  const statusStyle = STATUS_STYLE[video.status] ?? STATUS_STYLE.PENDING;
  const isProcessing = video.status === "PROCESSING" || video.status === "PENDING";

  return (
    <>
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
              <span className="text-xs text-muted-foreground">Daftar Video</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-foreground truncate">{video.original_filename}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm">
              <span className={`font-semibold ${statusStyle.color}`}>{statusStyle.label}</span>
              <span className="text-muted-foreground hidden sm:inline">·</span>
              <span className="text-muted-foreground">{video.total_plates} plat</span>
              <span className="text-muted-foreground hidden sm:inline">·</span>
              <span className="text-muted-foreground text-xs hidden sm:inline">{new Date(video.uploaded_at).toLocaleString("id-ID")}</span>
            </div>
          </div>
          <button
            onClick={exportCSV}
            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 md:px-4 border border-border text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium truncate">{progress?.message ?? "Memulai pemrosesan..."}</span>
              <span className="text-muted-foreground font-mono shrink-0 ml-2">{progress?.percent ?? 0}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Detections table — scrollable on mobile */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 md:px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{detections.length} Deteksi</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Foto</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nomor Plat</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Confidence</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Pajak</th>
                  <th className="px-4 md:px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {detections.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                          <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/>
                        </svg>
                        <p>{isProcessing ? "Menunggu hasil deteksi..." : "Tidak ada plat terdeteksi"}</p>
                      </div>
                    </td>
                  </tr>
                )}
                {detections.map((d) => {
                  const tax = TAX_STYLE[d.tax_status] ?? TAX_STYLE.NOT_FOUND;
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="px-4 md:px-5 py-3">
                        {d.image_crop_url ? (
                          <button
                            onClick={() => setLightbox({ src: d.image_crop_url, alt: d.plate_number })}
                            className="group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-colors"
                            title="Klik untuk perbesar"
                          >
                            <img
                              src={d.image_crop_url}
                              alt={d.plate_number}
                              className="h-12 md:h-14 w-auto object-cover group-hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/><path d="M3 16.2V21m0 0h4.8M3 21l6-6"/><path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/><path d="M3 7.8V3m0 0h4.8M3 3l6 6"/>
                              </svg>
                            </div>
                          </button>
                        ) : (
                          <div className="h-12 md:h-14 w-16 md:w-20 bg-muted rounded-lg flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">—</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 md:px-5 py-3">
                        <span className="font-mono font-bold text-sm md:text-base text-foreground tracking-widest">{d.plate_number}</span>
                      </td>

                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-foreground">{(d.confidence * 100).toFixed(1)}%</span>
                          <div className="w-16 bg-muted rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${d.confidence * 100}%` }} />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 md:px-5 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${tax.bg} ${tax.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tax.dot}`} />
                          <span className="hidden sm:inline">{tax.label}</span>
                          <span className="sm:hidden">{tax.label.slice(0, 4)}</span>
                        </div>
                      </td>

                      <td className="px-4 md:px-5 py-3">
                        {correctingId === d.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              type="text"
                              value={correctValue[d.id] ?? d.plate_number}
                              onChange={(e) => setCorrectValue((p) => ({ ...p, [d.id]: e.target.value.toUpperCase() }))}
                              onKeyDown={(e) => { if (e.key === "Enter") correctDetection(d.id); if (e.key === "Escape") setCorrectingId(null); }}
                              className="w-28 px-2 py-1 font-mono text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              onClick={() => correctDetection(d.id)}
                              disabled={recheckingId === d.id}
                              className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              {recheckingId === d.id ? "..." : "Simpan"}
                            </button>
                            <button
                              onClick={() => setCorrectingId(null)}
                              className="px-2 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => { setCorrectingId(d.id); setCorrectValue((p) => ({ ...p, [d.id]: d.plate_number })); }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-border text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                              title="Koreksi plat"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              <span className="hidden sm:inline">Koreksi</span>
                            </button>
                            <button
                              onClick={() => recheck(d.id)}
                              disabled={recheckingId === d.id}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={recheckingId === d.id ? "animate-spin" : ""}>
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
                              </svg>
                              <span className="hidden sm:inline">{recheckingId === d.id ? "..." : "Re-check"}</span>
                            </button>

                            {confirmDeleteId === d.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteDetection(d.id)}
                                  disabled={deletingId === d.id}
                                  className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-destructive text-white hover:bg-destructive/80 transition-colors disabled:opacity-50"
                                >
                                  {deletingId === d.id ? "..." : "Hapus"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(d.id)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Hapus deteksi"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
