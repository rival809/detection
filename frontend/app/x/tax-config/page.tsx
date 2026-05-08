"use client";
import { useState } from "react";
import api from "@/lib/api";

export default function TaxConfigPage() {
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleLoad() {
    setStatus("loading");
    setMessage("");
    try {
      const { data } = await api.get("/admin/config", {
        headers: { "x-admin-secret": secret },
      });
      setToken(data.TAX_API_TOKEN || "");
      setStatus("ok");
      setMessage("Konfigurasi berhasil dimuat.");
    } catch {
      setStatus("error");
      setMessage("Gagal memuat — secret salah atau server error.");
    }
  }

  async function handleSave() {
    if (!token.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      await api.put(
        "/admin/config",
        { key: "TAX_API_TOKEN", value: token.trim() },
        { headers: { "x-admin-secret": secret } },
      );
      setStatus("ok");
      setMessage("Token berhasil disimpan. Semua pengguna akan menggunakan token baru.");
    } catch {
      setStatus("error");
      setMessage("Gagal menyimpan — periksa secret dan coba lagi.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Konfigurasi API Pajak</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Update token autentikasi untuk API info pajak kendaraan.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Secret</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Masukkan admin secret"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          <button
            onClick={handleLoad}
            disabled={!secret || status === "loading"}
            className="w-full py-2 px-4 border border-border text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            Muat Konfigurasi Saat Ini
          </button>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Token Baru (Bearer JWT)</label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
              rows={5}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
            />
          </div>

          {message && (
            <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium ${
              status === "ok"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}>
              {status === "ok" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
              )}
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!secret || !token.trim() || status === "loading"}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Menyimpan...
              </span>
            ) : "Simpan Token"}
          </button>
        </div>
      </div>
    </div>
  );
}
