"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Pack = {
  key: string;
  label: string;
  credits: number;
  priceCents: number;
};

export function BuyCreditsModal() {
  const { buyRequest, closeBuy, user, openLogin } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [creditsPerVariant, setCpv] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buyRequest.open) return;
    setError(null);
    fetch("/api/billing/packs")
      .then((r) => r.json())
      .then((j) => {
        setPacks(j.packs);
        setCpv(j.creditsPerVariant);
      });
  }, [buyRequest.open]);

  if (!buyRequest.open) return null;

  async function buy(pack: string) {
    if (!user) {
      closeBuy();
      openLogin(() => {});
      return;
    }
    setBusy(pack);
    setError(null);
    const r = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack }),
    });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) {
      setError(j.error ?? "Checkout failed");
      return;
    }
    window.location.href = j.url;
  }

  return (
    <div className="modal-backdrop" onClick={closeBuy}>
      <div
        className="glass modal-card"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-1">Buy credits</h2>
        <p className="text-sm text-muted mb-5">
          {creditsPerVariant} credits per generated variant.
        </p>
        <div className="flex flex-col gap-3">
          {packs.map((p) => (
            <button
              key={p.key}
              onClick={() => buy(p.key)}
              disabled={busy !== null}
              className="glass glass-hover text-left p-4 flex items-center justify-between disabled:opacity-50"
            >
              <div>
                <div className="font-bold">
                  {p.label} <span className="text-orange-400">— {p.credits} credits</span>
                </div>
                <div className="text-xs text-muted">
                  ~{Math.floor(p.credits / creditsPerVariant)} variants
                </div>
              </div>
              <div className="text-lg font-bold">
                ${(p.priceCents / 100).toFixed(2)}
                {busy === p.key && <span className="ml-2 text-sm">…</span>}
              </div>
            </button>
          ))}
          {packs.length === 0 && (
            <div className="text-sm text-muted">Loading packs…</div>
          )}
        </div>
        {error && (
          <div className="alert-soft text-sm mt-4" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
            {error}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={closeBuy} className="btn-ghost text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
