"use client";
import { useEffect, useState } from "react";

type ConfirmProps = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
  onConfirm?: () => void;
  onAsyncConfirm?: () => Promise<void>;
  onCancel?: () => void;
};

type ModalState = ConfirmProps & { show: boolean };
const initial: ModalState = { show: false, title: "" };

let setStateExternal: ((s: ModalState) => void) | null = null;

export function confirm(props: ConfirmProps) {
  if (!setStateExternal) {
    console.warn("confirm(): mount <ConfirmRoot /> once in your app");
    return;
  }
  setStateExternal({ ...props, show: true });
}

export function ConfirmRoot() {
  const [modal, setModal] = useState<ModalState>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStateExternal = setModal;
    return () => {
      setStateExternal = null;
    };
  }, []);

  const close = () => setModal((p) => ({ ...p, show: false }));

  async function onConfirm() {
    if (modal.onAsyncConfirm) {
      setLoading(true);
      try {
        await modal.onAsyncConfirm();
      } finally {
        setLoading(false);
      }
    } else {
      modal.onConfirm?.();
    }
    close();
  }

  function onCancel() {
    modal.onCancel?.();
    close();
  }

  useEffect(() => {
    if (!modal.show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.show]);

  if (!modal.show) return null;

  const danger = modal.variant === "danger";

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        className="glass modal-card"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{modal.title}</h2>
        {modal.message && (
          <p className="mt-2 text-sm text-muted">{modal.message}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="btn-ghost text-sm">
            {modal.cancelText ?? "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={danger ? "btn-ghost text-sm" : "btn-3d"}
            style={
              danger
                ? {
                    background: "rgba(248, 113, 113, 0.15)",
                    borderColor: "rgba(248, 113, 113, 0.4)",
                    color: "#fca5a5",
                  }
                : undefined
            }
          >
            {loading ? "…" : (modal.confirmText ?? "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
