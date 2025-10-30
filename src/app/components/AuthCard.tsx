"use client";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-12 w-full rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-6 shadow-card backdrop-blur">
      <h1 className="text-2xl font-semibold tracking-tight text-heading">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-text/80">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      <p className="mt-6 text-xs text-text/70">
        By continuing you agree to our{" "}
        <a href="/terms" className="underline underline-offset-4 hover:opacity-80">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:opacity-80">
          Privacy
        </a>
        .
      </p>
    </div>
  );
}
