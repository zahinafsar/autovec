"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type Session = {
  id: string;
  title: string;
  status: "DRAFT" | "GENERATING" | "COMPLETED" | "FAILED";
  referenceImageUrl: string | null;
  updatedAt: string;
};

export function DashboardClient() {
  const { user, loading, openLogin } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      openLogin(() => location.reload());
      return;
    }
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((j) => {
        setSessions(j.sessions ?? []);
        setLoaded(true);
      });
  }, [loading, user, openLogin]);

  async function newSession() {
    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled session" }),
    });
    const j = await r.json();
    if (j.session) router.push(`/s/${j.session.id}`);
  }

  if (loading || !user) {
    return (
      <section className="max-w-5xl mx-auto px-6 py-16 text-center text-muted">
        Loading…
      </section>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted text-sm mt-1">
            All your drafts and generated cartoon variants.
          </p>
        </div>
        <button onClick={newSession} className="btn-3d">
          + New session
        </button>
      </div>

      {loaded && sessions.length === 0 && (
        <div className="glass p-12 text-center">
          <p className="text-muted">No sessions yet.</p>
          <button onClick={newSession} className="btn-3d mt-4">
            Create your first session
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((s) => (
          <Link key={s.id} href={`/s/${s.id}`} className="glass glass-hover p-4 flex flex-col gap-3">
            <div className="aspect-video rounded-lg overflow-hidden bg-[#0c0c12] grid place-items-center">
              {s.referenceImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.referenceImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted text-xs">No reference yet</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-semibold truncate">{s.title}</div>
              <StatusBadge status={s.status} />
            </div>
            <div className="text-xs text-muted">
              {new Date(s.updatedAt).toLocaleString()}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: Session["status"] }) {
  const map: Record<Session["status"], { color: string; label: string }> = {
    DRAFT: { color: "rgba(255,255,255,0.5)", label: "Draft" },
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
