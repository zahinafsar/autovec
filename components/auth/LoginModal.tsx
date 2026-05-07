"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function LoginModal() {
  const { loginRequest, closeLogin, refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loginRequest.open) {
      setError(null);
      setEmail("");
      setPassword("");
      setName("");
    }
  }, [loginRequest.open]);

  if (!loginRequest.open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body = mode === "login"
      ? { email, password }
      : { email, password, name };
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(j.error ?? "Failed");
      return;
    }
    const u = await refresh();
    closeLogin();
    if (u) loginRequest.onSuccess?.();
  }

  return (
    <div className="modal-backdrop" onClick={closeLogin}>
      <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm text-muted hover:text-foreground"
          >
            {mode === "login" ? "Need account?" : "Have account?"}
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              className="input-modern"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="input-modern"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input-modern"
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <div className="alert-soft text-sm" style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-3d mt-2" disabled={busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
