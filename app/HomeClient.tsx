"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ImageDropzone } from "@/components/ImageDropzone";

export function HomeClient() {
  const router = useRouter();
  const { user, openLogin, openBuy, refresh } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launching = useRef(false);

  async function start() {
    if (launching.current) return;
    setError(null);
    if (!refUrl) {
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
        const r = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            referenceImageUrl: refUrl,
            title: prompt ? prompt.slice(0, 60) : "Untitled session",
          }),
        });
        const j = await r.json();
        if (!r.ok) {
          setError(j.error ?? "Failed to create session");
          setBusy(false);
          launching.current = false;
          return;
        }
        if (me.credits < 10) {
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
        <ImageDropzone value={refUrl} onChange={setRefUrl} />
        <textarea
          className="input-modern resize-none"
          rows={3}
          placeholder="Describe the cartoon (e.g. happy, waving, sunset background)…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        {error && (
          <div className="alert-soft text-sm" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
            {error}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            You can add more variants on the next screen.
          </span>
          <button onClick={start} className="btn-3d" disabled={busy}>
            {busy ? "Creating…" : "Generate →"}
          </button>
        </div>
      </div>
    </section>
  );
}
