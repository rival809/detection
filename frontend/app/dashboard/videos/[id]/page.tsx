"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const TAX_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-800",
  NOT_FOUND: "bg-gray-100 text-gray-600",
  ERROR: "bg-orange-100 text-orange-800",
};

interface Progress { stage: string; percent: number; message: string }

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<any>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
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
          api.get(`/videos/${id}`).then(({ d }) => setVideo(d));
          api.get(`/videos/${id}/detections`).then(({ data }) => setDetections(data.items));
          ws.close();
        }
      };
      return () => ws.close();
    }
  }, [video?.status]);

  async function recheck(detectionId: string) {
    const { data } = await api.post(`/videos/${id}/detections/${detectionId}/recheck`);
    setDetections((prev) => prev.map((d) => (d.id === detectionId ? data : d)));
  }

  function exportCSV() {
    const header = "Plat Nomor,Confidence,Status Pajak\n";
    const rows = detections.map((d) => `${d.plate_number},${d.confidence.toFixed(2)},${d.tax_status}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `deteksi-${id}.csv`; a.click();
  }

  if (!video) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{video.original_filename}</h1>
          <p className="text-sm text-gray-500">Status: {video.status} · {video.total_plates} plat ditemukan</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
      </div>

      {progress && video.status !== "COMPLETED" && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{progress.message}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded h-2">
            <div className="bg-blue-500 h-2 rounded transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Foto Plat</th>
              <th className="p-3 text-left">Nomor Plat</th>
              <th className="p-3 text-left">Confidence</th>
              <th className="p-3 text-left">Status Pajak</th>
              <th className="p-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((d) => (
              <tr key={d.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  {d.image_crop_url && <img src={d.image_crop_url} alt={d.plate_number} className="h-10 rounded" />}
                </td>
                <td className="p-3 font-mono font-bold">{d.plate_number}</td>
                <td className="p-3">{(d.confidence * 100).toFixed(1)}%</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${TAX_COLOR[d.tax_status]}`}>{d.tax_status}</span>
                </td>
                <td className="p-3">
                  {d.tax_status === "ERROR" && (
                    <button onClick={() => recheck(d.id)} className="text-blue-600 hover:underline text-xs">Re-check</button>
                  )}
                </td>
              </tr>
            ))}
            {detections.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">Belum ada deteksi</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
