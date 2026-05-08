"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  total_videos: number;
  total_plates: number;
  active_tax: number;
  expired_tax: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get("/videos?size=100").then(({ data }) => {
      const videos = data.items;
      let plates = 0, active = 0, expired = 0;
      videos.forEach((v: any) => { plates += v.total_plates || 0; });
      setStats({ total_videos: data.total, total_plates: plates, active_tax: active, expired_tax: expired });
    });
  }, []);

  const cards = [
    { label: "Total Video", value: stats?.total_videos ?? "-" },
    { label: "Total Plat Terdeteksi", value: stats?.total_plates ?? "-" },
    { label: "Pajak Aktif", value: stats?.active_tax ?? "-" },
    { label: "Pajak Mati / Kadaluarsa", value: stats?.expired_tax ?? "-" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4">
        <a href="/dashboard/videos" className="text-blue-600 hover:underline text-sm">Lihat semua video →</a>
      </div>
    </div>
  );
}
