"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get(`/videos?page=${page}&size=20`).then(({ data }) => {
      setVideos(data.items);
      setTotal(data.total);
    });
  }, [page]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Daftar Video</h1>
        <a href="/dashboard/upload">
          <Button>Upload Video</Button>
        </a>
      </div>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Nama File</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Jumlah Plat</th>
              <th className="p-3 text-left">Upload</th>
              <th className="p-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{v.original_filename}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[v.status]}`}>{v.status}</span>
                </td>
                <td className="p-3">{v.total_plates}</td>
                <td className="p-3">{new Date(v.uploaded_at).toLocaleString("id-ID")}</td>
                <td className="p-3">
                  <a href={`/dashboard/videos/${v.id}`} className="text-blue-600 hover:underline">Detail</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 items-center text-sm text-gray-600">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border rounded disabled:opacity-40">Prev</button>
        <span>Halaman {page} / {Math.ceil(total / 20) || 1}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total} className="px-2 py-1 border rounded disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
