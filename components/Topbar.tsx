"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { BuyCreditsModal } from "@/components/billing/BuyCreditsModal";

export function Topbar() {
  const { user, loading, openLogin, openBuy, setUser } = useAuth();
  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[rgba(7,7,11,0.6)] border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-purple-500" />
            <span className="font-bold tracking-tight text-lg">Autovec</span>
          </Link>
          <nav className="flex items-center gap-3">
            {!loading && user && (
              <>
                <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
                  Dashboard
                </Link>
                <button onClick={() => openBuy()} className="chip chip-toggle">
                  <span className="text-orange-400 font-semibold">{user.credits}</span>
                  <span>credits</span>
                </button>
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setUser(null);
                  }}
                  className="btn-ghost text-sm"
                >
                  Sign out
                </button>
              </>
            )}
            {!loading && !user && (
              <button onClick={() => openLogin()} className="btn-ghost text-sm">
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>
      <LoginModal />
      <BuyCreditsModal />
    </>
  );
}
