"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "@/lib/api";

interface Stats {
  total_videos: number;
  processing_videos: number;
  total_plates: number;
  active_tax: number;
  expired_tax: number;
  not_found_tax: number;
  error_tax: number;
}

interface ReviewStats {
  pending: number;
  approved: number;
  corrected: number;
  rejected: number;
  total_labeled: number;
  accuracy_rate: number;
  active_confusion_rules: number;
}

interface TrendItem { date: string; count: number }

const STAT_CARDS = (s: Stats) => [
  {
    label: "Total Video",
    value: s.total_videos,
    sub: `${s.processing_videos} sedang diproses`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>
      </svg>
    ),
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    label: "Total Plat",
    value: s.total_plates,
    sub: "dari semua video",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    label: "Pajak Aktif",
    value: s.active_tax,
    sub: "kendaraan terdaftar",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    label: "Pajak Kadaluarsa",
    value: s.expired_tax,
    sub: "perlu perhatian",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
    ),
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    label: "Tidak Ditemukan",
    value: s.not_found_tax,
    sub: "data tidak tersedia",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>
      </svg>
    ),
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    label: "Gagal Cek Pajak",
    value: s.error_tax,
    sub: "perlu dicek ulang",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    ),
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);

  useEffect(() => {
    api.get("/stats/dashboard").then(({ data }) => setStats(data));
    api.get("/stats/trend?days=7").then(({ data }) => setTrend(data.trend));
    api.get("/stats/review").then(({ data }) => setReviewStats(data));
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ringkasan deteksi plat nomor & status pajak</p>
        </div>
        <a
          href="/dashboard/upload"
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 md:px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          <span className="hidden sm:inline">Upload Video</span>
          <span className="sm:hidden">Upload</span>
        </a>
      </div>

      {/* Stat cards */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {STAT_CARDS(stats).map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4 md:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{c.label}</p>
                  <p className={`text-2xl md:text-3xl font-bold mt-2 ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{c.sub}</p>
                </div>
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.color}`}>
                  {c.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 md:p-5 h-24 md:h-28 animate-pulse" />
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-foreground">Tren Deteksi Plat</p>
            <p className="text-xs text-muted-foreground mt-0.5">7 hari terakhir</p>
          </div>
        </div>
        {trend.length === 0 ? (
          <div className="h-40 md:h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Belum ada data deteksi</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 8%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "oklch(0.65 0.02 264)" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.65 0.02 264)" }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, "Plat"]}
                labelFormatter={(l) => `Tanggal: ${l}`}
                contentStyle={{ fontSize: 12, backgroundColor: "oklch(0.18 0.01 264)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", color: "oklch(0.95 0 0)" }}
              />
              <Bar dataKey="count" fill="oklch(0.6 0.22 264)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Review / Active Learning Stats */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Active Learning</p>
            <p className="text-xs text-muted-foreground mt-0.5">Performa review antrian & confusion map</p>
          </div>
          <a href="/dashboard/review" className="text-xs font-medium text-primary hover:underline shrink-0">
            Buka →
          </a>
        </div>

        {reviewStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{reviewStats.pending}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Menunggu Review</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{reviewStats.total_labeled}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Dilabel</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                {reviewStats.total_labeled > 0 ? `${Math.round(reviewStats.accuracy_rate * 100)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">OCR Akurat</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-violet-400">{reviewStats.active_confusion_rules}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rule Aktif</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-muted/50 p-3 h-16 animate-pulse" />
            ))}
          </div>
        )}

        {reviewStats && reviewStats.total_labeled > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              {reviewStats.approved} benar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              {reviewStats.corrected} dikoreksi
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              {reviewStats.rejected} dibuang
            </span>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <a href="/dashboard/videos" className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>
          </svg>
          Lihat Semua Video
        </a>
        <a href="/dashboard/review" className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
          </svg>
          Antrian Review
        </a>
      </div>
    </div>
  );
}
