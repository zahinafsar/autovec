import Link from "next/link";

export default function BillingSuccess() {
  return (
    <section className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="glass p-10 fade-up">
        <h1 className="text-3xl font-bold mb-3">Payment received</h1>
        <p className="text-muted mb-6">
          Credits will appear on your account within a few seconds.
        </p>
        <Link href="/dashboard" className="btn-3d inline-flex">
          Go to dashboard →
        </Link>
      </div>
    </section>
  );
}
