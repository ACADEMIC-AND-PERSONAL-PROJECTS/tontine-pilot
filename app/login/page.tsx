import { AuthCard } from "@/components/auth/auth-card";

export default function LoginPage() {
  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 py-16">
      <div className="luminous-wash opacity-80" />
      <div className="grid-overlay" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div className="relative z-[1]">
        <AuthCard />
      </div>
    </section>
  );
}
