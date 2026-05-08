"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  total_videos: number;
  processing_videos: number;
  total_plates: number;
  active_tax: number;
  expired_tax: number;
  not_found_tax: number;
  error_tax: number;
}

interface TrendItem {
  date: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);

  useEffect(() => {
    api.get("/stats/dashboard").then(({ data }) => setStats(data));
    api.get("/stats/trend?days=7").then(({ data }) => setTrend(data.trend));
  }, []);

  const statCards = [
    { label: "Total Video", value: stats?.total_videos ?? "-", sub: `${stats?.processing_videos ?? 0} sedang diproses`, color: "text-blue-600" },
    { label: "Total Plat Terdeteksi", value: stats?.total_plates ?? "-", sub: "dari semua video", color: "text-gray-700" },
    { label: "Pajak Aktif", value: stats?.active_tax ?? "-", sub: "kendaraan terdaftar", color: "text-green-600" },
    { label: "Pajak Kadaluarsa", value: stats?.expired_tax ?? "-", sub: "perlu perhatian", color: "text-red-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ringkasan deteksi plat nomor & status pajak</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tidak Ditemukan</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-gray-400">{stats?.not_found_tax ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gagal Cek Pajak</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-orange-400">{stats?.error_tax ?? "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Deteksi Plat — 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {trend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Belum ada data deteksi
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, "Plat"]}
                  labelFormatter={(l) => `Tanggal: ${l}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex gap-3">
        <a href="/dashboard/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          ↑ Upload Video Baru
        </a>
        <a href="/dashboard/videos" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          ▦ Lihat Semua Video
        </a>
      </div>
    </div>
  );
}
