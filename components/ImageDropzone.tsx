"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function ImageDropzone({
  value,
  onChange,
  onFile,
  defer = false,
  label = "Reference cartoon",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onFile?: (file: File | null) => void;
  defer?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, openLogin } = useAuth();

  async function handleFile(file: File) {
    if (defer) {
      const objUrl = URL.createObjectURL(file);
      onFile?.(file);
      onChange(objUrl);
      return;
    }
    if (!user) {
      openLogin(() => inputRef.current?.click());
      return;
    }
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "ref");
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(j.error ?? "Upload failed");
      return;
    }
    onChange(j.url);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className="cursor-pointer rounded-xl border border-dashed border-white/10 bg-[#101018] hover:border-orange-400/40 transition-colors p-4 flex items-center gap-4 min-h-[120px]"
      >
        {value ? (
          <>
            { /* eslint-disable-next-line @next/next/no-img-element */ }
            <img src={value} alt="ref" className="w-24 h-24 object-cover rounded-lg" />
            <div className="flex-1">
              <div className="font-semibold">Reference uploaded</div>
              <div className="text-xs text-muted">Click or drop new image to replace</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                onFile?.(null);
              }}
              className="btn-ghost text-xs"
            >
              Remove
            </button>
          </>
        ) : (
          <div className="flex-1 text-center text-muted">
            {busy ? "Uploading…" : "Click or drop a cartoon image (PNG, JPG, WEBP)"}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
