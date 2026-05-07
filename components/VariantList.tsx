"use client";
import { useEffect, useState } from "react";
import { X, Sparkles, RefreshCw } from "lucide-react";

type Variant = {
  id: string;
  position: number;
  prompt: string;
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
  resultUrl: string | null;
  error: string | null;
};

export function VariantList({
  variants,
  onAdd,
  onRemove,
  onUpdate,
  onGenerate,
}: {
  variants: Variant[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, prompt: string) => void;
  onGenerate: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {variants.map((v, i) => (
        <VariantRow
          key={v.id}
          index={i}
          variant={v}
          onRemove={() => onRemove(v.id)}
          onUpdate={(p) => onUpdate(v.id, p)}
          onGenerate={() => onGenerate(v.id)}
          canRemove={variants.length > 1}
        />
      ))}
      <button
        onClick={onAdd}
        className="glass glass-hover p-4 text-center text-muted hover:text-foreground"
      >
        + Add variant
      </button>
    </div>
  );
}

function VariantRow({
  index,
  variant,
  onRemove,
  onUpdate,
  onGenerate,
  canRemove,
}: {
  index: number;
  variant: Variant;
  onRemove: () => void;
  onUpdate: (p: string) => void;
  onGenerate: () => void;
  canRemove: boolean;
}) {
  const [text, setText] = useState(variant.prompt);
  useEffect(() => setText(variant.prompt), [variant.prompt]);

  const generating = variant.status === "GENERATING";
  const hasResult = variant.status === "COMPLETED" && !!variant.resultUrl;

  return (
    <div className="glass p-4 flex flex-col sm:flex-row gap-4 items-stretch">
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted">
              Variant {index + 1}
            </span>
            <StatusBadge status={variant.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/15 hover:bg-orange-500/25 border border-orange-400/40 text-orange-300 hover:text-orange-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {hasResult ? (
                <RefreshCw size={12} strokeWidth={2.4} />
              ) : (
                <Sparkles size={12} strokeWidth={2.4} />
              )}
              {hasResult ? "Regenerate" : "Generate"}
            </button>
            {canRemove && !generating && (
              <button
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-400/40 text-muted hover:text-red-400 transition-colors"
              >
                <X size={12} strokeWidth={2.4} />
                Remove
              </button>
            )}
          </div>
        </div>
        <textarea
          className="input-modern resize-none flex-1 min-h-0"
          placeholder="Describe this variation (e.g. wearing a chef hat, looking surprised)…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== variant.prompt) onUpdate(text);
          }}
          disabled={generating}
        />
        {variant.error && (
          <div className="text-xs text-red-400">{variant.error}</div>
        )}
      </div>

      <div className={`variant-card w-44 ${variant.resultUrl ? "has-result" : ""}`}>
        {generating && (
          <div className="ai-thinking">
            <div className="ai-orb">
              <div className="ai-orb-ring" />
              <div className="ai-orb-core" />
            </div>
            <span className="ai-shimmer-text">Generating</span>
          </div>
        )}
        {variant.resultUrl && !generating && (
          <a href={variant.resultUrl} target="_blank" rel="noreferrer">
            { /* eslint-disable-next-line @next/next/no-img-element */ }
            <img src={variant.resultUrl} alt={`variant ${index + 1}`} />
          </a>
        )}
        {!variant.resultUrl && !generating && (
          <span className="text-xs text-muted">No image yet</span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Variant["status"] }) {
  const map: Record<Variant["status"], { color: string; label: string }> = {
    PENDING: { color: "rgba(255,255,255,0.5)", label: "Pending" },
    GENERATING: { color: "var(--accent)", label: "Generating" },
    COMPLETED: { color: "#34d399", label: "Done" },
    FAILED: { color: "#f87171", label: "Failed" },
  };
  const m = map[status];
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border"
      style={{ color: m.color, borderColor: m.color }}
    >
      {m.label}
    </span>
  );
}
