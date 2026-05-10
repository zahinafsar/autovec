"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ImageDropzone } from "@/components/ImageDropzone";
import { confirm } from "@/components/ConfirmModal";

const CREDITS_PER = 10;

export function HomeClient() {
  const router = useRouter();
  const { user, openLogin, openBuy, refresh } = useAuth();
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launching = useRef(false);

  function updatePrompt(i: number, v: string) {
    setPrompts((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  }
  function addAfter(i: number) {
    setPrompts((prev) => [...prev.slice(0, i + 1), "", ...prev.slice(i + 1)]);
  }
  function removeAt(i: number) {
    if (prompts.length === 1) return;
    confirm({
      title: "Remove this variant?",
      message: "The prompt for this variant will be discarded.",
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: () =>
        setPrompts((prev) =>
          prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i),
        ),
    });
  }

  async function runStart() {
    if (launching.current) return;
    setError(null);
    if (!file) {
      setError("Upload a reference cartoon first.");
      return;
    }

    const after = async () => {
      launching.current = true;
      setBusy(true);
      try {
        const me = await refresh();
        if (!me) {
          setBusy(false);
          launching.current = false;
          openLogin(after);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", "ref");
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upJson = await upRes.json();
        if (!upRes.ok) {
          setError(upJson.error ?? "Upload failed");
          setBusy(false);
          launching.current = false;
          return;
        }
        const referenceImageUrl = upJson.url;

        const titleSeed = prompts.find((p) => p.trim()) ?? "";
        const r = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompts,
            referenceImageUrl,
            title: titleSeed ? titleSeed.slice(0, 60) : "Untitled session",
          }),
        });
        const j = await r.json();
        if (!r.ok) {
          setError(j.error ?? "Failed to create session");
          setBusy(false);
          launching.current = false;
          return;
        }
        const cost = prompts.length * 10;
        if (me.credits < cost) {
          openBuy(() => router.push(`/s/${j.session.id}`));
        }
        router.push(`/s/${j.session.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
        setBusy(false);
        launching.current = false;
      }
    };

    if (!user) {
      openLogin(after);
    } else {
      after();
    }
  }

  function start() {
    if (!file) {
      setError("Upload a reference cartoon first.");
      return;
    }
    const cost = prompts.length * CREDITS_PER;
    confirm({
      title: `Generate ${prompts.length} variant${prompts.length > 1 ? "s" : ""}?`,
      message: `This will use ${cost} credits${
        user ? ` (you have ${user.credits})` : ""
      }.`,
      confirmText: `Generate (${cost} credits)`,
      cancelText: "Cancel",
      onConfirm: () => runStart(),
    });
  }

  return (
    <section className="max-w-3xl mx-auto px-6 pt-16 pb-24">
      <div className="text-center mb-10 fade-up">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          <span className="text-gradient">Cartoon variants</span>
          <br />
          <span>from one reference.</span>
        </h1>
        <p className="text-muted mt-4 max-w-xl mx-auto">
          Upload a cartoon, describe variations, and let AI generate them. 10 credits
          per variant.
        </p>
      </div>

      <div className="glass p-6 fade-up delay-100 flex flex-col gap-4">
        <ImageDropzone
          defer
          value={previewUrl}
          onChange={(u) => {
            if (!u && previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(u);
          }}
          onFile={setFile}
        />

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Variants</span>
          {prompts.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="input-modern flex-1"
                placeholder={`Variant ${i + 1} — e.g. happy, waving, sunset bg…`}
                value={p}
                onChange={(e) => updatePrompt(i, e.target.value)}
              />
              <button
                onClick={() => addAfter(i)}
                aria-label="Add variant below"
                className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-orange-500/15 hover:bg-orange-500/25 border border-orange-400/40 text-orange-300 hover:text-orange-200 transition-colors"
              >
                <Plus size={14} strokeWidth={2.4} />
              </button>
              <button
                onClick={() => removeAt(i)}
                disabled={prompts.length === 1}
                aria-label="Remove variant"
                className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-400/40 text-muted hover:text-red-400 transition-colors disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:border-white/10 disabled:hover:text-muted"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="alert-soft text-sm" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
            {error}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {prompts.length} variant{prompts.length > 1 ? "s" : ""} · {prompts.length * 10} credits
          </span>
          <button onClick={start} className="btn-3d" disabled={busy}>
            {busy ? "Creating…" : "Generate →"}
          </button>
        </div>
      </div>
    </section>
  );
}
