"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    setFile(accepted[0] || null);
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/mp4": [".mp4"], "video/x-msvideo": [".avi"], "video/quicktime": [".mov"] },
    maxFiles: 1,
  });

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post("/videos/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      router.push(`/dashboard/videos/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Upload gagal");
      setUploading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Upload Video</h1>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <p className="text-gray-700 font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <p className="text-gray-500">Drag & drop video di sini, atau klik untuk pilih file<br /><span className="text-xs">MP4, AVI, MOV · Maks 500MB</span></p>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Mengupload...</span><span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded h-2">
            <div className="bg-blue-500 h-2 rounded transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
        {uploading ? "Mengupload..." : "Upload & Proses"}
      </Button>
    </div>
  );
}
