"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { ImageDropzone } from "@/components/ImageDropzone";
import { OptionsPanel } from "@/components/OptionsPanel";
import { VariantList } from "@/components/VariantList";
import { CropModal } from "@/components/CropModal";
import { ChevronLeft } from "lucide-react";
import { confirm } from "@/components/ConfirmModal";

type Variant = {
  id: string;
  position: number;
  prompt: string;
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
  resultUrl: string | null;
  error: string | null;
};

type SessionData = {
  id: string;
  title: string;
  commonPrompt: string;
  referenceImageUrl: string | null;
  originalReferenceUrl: string | null;
  options: { transparent: boolean };
  status: "DRAFT" | "GENERATING" | "COMPLETED" | "FAILED";
  variants: Variant[];
};

const CREDITS_PER = 10;

export function SessionClient({ id }: { id: string }) {
  const { user, loading, refresh, openLogin, openBuy } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [commonDraft, setCommonDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/sessions/${id}`);
    if (!r.ok) {
      setError("Session not found");
      return;
    }
    const j = await r.json();
    setSession(j.session);
    setTitleDraft(j.session.title);
    setCommonDraft(j.session.commonPrompt ?? "");
  }, [id]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      openLogin(() => location.reload());
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [loading, user, openLogin, load]);

  useEffect(() => {
    if (!session) return;
    const isActive = session.status === "GENERATING" || session.variants.some((v) => v.status === "GENERATING");
    if (isActive) {
      pollTimer.current = setInterval(async () => {
        const r = await fetch(`/api/sessions/${id}/refresh`);
        if (!r.ok) return;
        const j = await r.json();
        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: j.status,
                variants: prev.variants.map((v) => {
                  const u = j.variants.find((x: Variant) => x.id === v.id);
                  return u ? { ...v, ...u } : v;
                }),
              }
            : prev,
        );
        if (j.status !== "GENERATING") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          refresh();
        }
      }, 2500);
      return () => {
        if (pollTimer.current) clearInterval(pollTimer.current);
      };
    }
  }, [session, id, refresh]);

  async function patchSession(patch: Partial<SessionData>) {
    const r = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const j = await r.json();
      setSession(j.session);
    }
  }

  async function addVariant() {
    const r = await fetch(`/api/sessions/${id}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "" }),
    });
    if (r.ok) load();
  }

  async function removeVariant(vid: string) {
    await fetch(`/api/sessions/${id}/variants/${vid}`, { method: "DELETE" });
    load();
  }

  async function updateVariant(vid: string, prompt: string) {
    setSession((prev) =>
      prev
        ? { ...prev, variants: prev.variants.map((v) => (v.id === vid ? { ...v, prompt } : v)) }
        : prev,
    );
    await fetch(`/api/sessions/${id}/variants/${vid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  }

  async function runGenerateOne(variantId: string) {
    setError(null);
    if (!session) return;
    if (!session.referenceImageUrl) {
      setError("Upload a reference image first.");
      return;
    }
    if ((user?.credits ?? 0) < CREDITS_PER) {
      openBuy(() => runGenerateOne(variantId));
      return;
    }
    setSession((prev) =>
      prev
        ? {
            ...prev,
            variants: prev.variants.map((v) =>
              v.id === variantId
                ? { ...v, status: "GENERATING", error: null, resultUrl: null }
                : v,
            ),
          }
        : prev,
    );
    const r = await fetch(`/api/sessions/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: [variantId] }),
    });
    const j = await r.json();
    if (!r.ok) {
      if (r.status === 402) {
        openBuy(() => runGenerateOne(variantId));
      } else {
        setError(j.error ?? "Generation failed");
      }
      load();
      return;
    }
    refresh();
    load();
  }

  function generateOne(variantId: string) {
    if (!session) return;
    const v = session.variants.find((x) => x.id === variantId);
    const isRegen = v?.status === "COMPLETED" && !!v.resultUrl;
    if (isRegen) {
      confirm({
        title: "Regenerate this variant?",
        message: `This will replace the current image and cost ${CREDITS_PER} credits. You have ${user?.credits ?? 0} credits.`,
        confirmText: `Regenerate (${CREDITS_PER} credits)`,
        cancelText: "Cancel",
        onConfirm: () => runGenerateOne(variantId),
      });
      return;
    }
    runGenerateOne(variantId);
  }

  async function generateAll() {
    setError(null);
    if (!session) return;
    if (!session.referenceImageUrl) {
      setError("Upload a reference image first.");
      return;
    }
    const pending = session.variants.filter(
      (v) => v.status === "PENDING" || v.status === "FAILED",
    );
    if (pending.length === 0) {
      setError("All variants generated. Add a new one or regenerate individually.");
      return;
    }
    const cost = pending.length * CREDITS_PER;
    if ((user?.credits ?? 0) < cost) {
      openBuy(() => generateAll());
      return;
    }
    setGenerating(true);
    setSession((prev) =>
      prev
        ? {
            ...prev,
            variants: prev.variants.map((v) =>
              pending.find((p) => p.id === v.id)
                ? { ...v, status: "GENERATING", error: null, resultUrl: null }
                : v,
            ),
          }
        : prev,
    );
    // fan out one HTTP call per variant in parallel
    const results = await Promise.all(
      pending.map((v) =>
        fetch(`/api/sessions/${id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantIds: [v.id] }),
        }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) })),
      ),
    );
    setGenerating(false);
    const insufficient = results.find((r) => r.status === 402);
    if (insufficient) {
      openBuy(() => generateAll());
    } else {
      const failed = results.find((r) => !r.ok);
      if (failed) setError(failed.body?.error ?? "Some variants failed to start");
    }
    refresh();
    load();
  }

  if (loading || !user || !session) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16 text-center text-muted">
        {error ?? "Loading…"}
      </section>
    );
  }

  const pendingCount = session.variants.filter(
    (v) => v.status === "PENDING" || v.status === "FAILED",
  ).length;
  const cost = pendingCount * CREDITS_PER;

  return (
    <section className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-1">
          <Link
            href="/dashboard"
            aria-label="Back to sessions"
            className="w-9 h-9 rounded-full grid place-items-center bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </Link>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft !== session.title) patchSession({ title: titleDraft });
            }}
            className="bg-transparent border-none outline-none text-2xl font-bold flex-1 max-w-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside className="flex flex-col gap-4">
          <div className="glass p-5 flex flex-col gap-4">
            <ImageDropzone
              value={session.referenceImageUrl}
              onChange={(url) =>
                patchSession({
                  referenceImageUrl: url,
                  originalReferenceUrl: url,
                })
              }
            />
            {session.referenceImageUrl && (
              <button onClick={() => setCropOpen(true)} className="btn-ghost text-xs">
                Crop reference
              </button>
            )}
          </div>

          <div className="glass p-5 flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-muted">
              Common prompt
            </span>
            <textarea
              className="input-modern resize-none"
              rows={4}
              placeholder="e.g. cartoon vector style, set in a magical forest, vivid colors…"
              value={commonDraft}
              onChange={(e) => setCommonDraft(e.target.value)}
              onBlur={() => {
                if (commonDraft !== session.commonPrompt)
                  patchSession({ commonPrompt: commonDraft });
              }}
            />
          </div>

          <div className="glass p-5">
            <OptionsPanel
              value={session.options}
              onChange={(opts) => patchSession({ options: opts })}
            />
          </div>

          <div className="glass p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted">Cost</span>
              <span className="text-sm">
                <span className="text-orange-400 font-bold">{cost}</span> credits
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted mb-4">
              <span>You have</span>
              <span>{user.credits} credits</span>
            </div>
            <button
              onClick={generateAll}
              disabled={generating || pendingCount === 0 || session.status === "GENERATING"}
              className="btn-3d w-full"
            >
              {session.status === "GENERATING"
                ? "Generating…"
                : pendingCount === 0
                  ? "Nothing to generate"
                  : `Generate ${pendingCount} variant${pendingCount > 1 ? "s" : ""}`}
            </button>
            {error && (
              <div className="alert-soft text-xs mt-3" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
                {error}
              </div>
            )}
          </div>
        </aside>

        <div>
          <VariantList
            variants={session.variants}
            onAdd={addVariant}
            onRemove={removeVariant}
            onUpdate={updateVariant}
            onGenerate={generateOne}
          />
        </div>
      </div>

      {cropOpen && (session.originalReferenceUrl ?? session.referenceImageUrl) && (
        <CropModal
          src={(session.originalReferenceUrl ?? session.referenceImageUrl) as string}
          onClose={() => setCropOpen(false)}
          onCropped={(url) => {
            setCropOpen(false);
            patchSession({ referenceImageUrl: url });
          }}
        />
      )}
    </section>
  );
}
