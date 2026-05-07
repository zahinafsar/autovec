"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const QUICK = [100, 500, 2000];

export function BuyCreditsModal() {
  const { buyRequest, closeBuy, user, openLogin } = useAuth();
  const [credits, setCredits] = useState<number>(500);
  const [creditsPerVariant, setCpv] = useState(10);
  const [pricePerCredit, setPpc] = useState(10); // cents
  const [minCredits, setMin] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buyRequest.open) return;
    setError(null);
    fetch("/api/billing/packs")
      .then((r) => r.json())
      .then((j) => {
        setCpv(j.creditsPerVariant);
        setPpc(j.priceCentsPerCredit);
        setMin(j.minCredits);
        setCredits((c) => Math.max(j.minCredits, c));
      });
  }, [buyRequest.open]);

  if (!buyRequest.open) return null;

  const cents = Math.max(minCredits, credits) * pricePerCredit;
  const variants = Math.floor(credits / creditsPerVariant);
  const tooLow = credits < minCredits;

  async function buy() {
    if (!user) {
      closeBuy();
      openLogin(() => {});
      return;
    }
    if (tooLow) return;
    setBusy(true);
    setError(null);
    const r = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits }),
    });
    const j = await r.json();
    setBusy(false);
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
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-1">Buy credits</h2>
        <p className="text-sm text-muted mb-5">
          {creditsPerVariant} credits per generated variant. Min {minCredits} credits.
        </p>

        <label className="text-xs uppercase tracking-wider text-muted">Credits</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="number"
            min={minCredits}
            step={1}
            value={credits}
            onChange={(e) => setCredits(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="input-modern flex-1"
          />
          <div className="text-right">
            <div className="text-2xl font-bold">${(cents / 100).toFixed(2)}</div>
            <div className="text-[11px] text-muted">~{variants} variant{variants === 1 ? "" : "s"}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setCredits(q)}
              className={`chip chip-toggle ${credits === q ? "on" : ""}`}
            >
              {q}
            </button>
          ))}
        </div>

        {tooLow && (
          <div className="alert-soft text-xs mt-3" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
            Minimum {minCredits} credits.
          </div>
        )}
        {error && (
          <div className="alert-soft text-xs mt-3" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={closeBuy} className="btn-ghost text-sm" disabled={busy}>
            Cancel
          </button>
          <button onClick={buy} className="btn-3d" disabled={busy || tooLow}>
            {busy ? "…" : `Buy for $${(cents / 100).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
