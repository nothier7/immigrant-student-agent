import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";

type Hub = {
  school_code: string;
  display_name: string;
  campus_url: string | null;
  immigrant_center_url: string | null;
  metadata: Record<string, any> | null;
};

export const dynamic = "force-dynamic";

export default async function SchoolsIndexPage() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("school_hubs")
    .select("school_code, display_name, campus_url, immigrant_center_url, metadata, active")
    .eq("active", true)
    .order("display_name", { ascending: true });

  const hubs = (data as Hub[] | null) ?? [];

  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      {/* Subtle gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(45,190,133,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.18),transparent_55%)]"
      />

      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-heading">CUNY School Hubs</h1>
        <p className="mt-2 text-sm text-text/80">
          Browse campus hubs for immigrant student support — resources, deadlines, and key links.
        </p>

        {hubs.length === 0 ? (
          <p className="mt-6 text-sm text-text/70">No schools found. Check Supabase configuration or seeds.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hubs.map((h) => (
              <div
                key={h.school_code}
                className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-heading leading-tight">
                    {h.display_name}
                  </h2>
                  <span className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-0.5 text-[10px] uppercase">
                    {h.school_code}
                  </span>
                </div>
                {h.metadata?.tagline && (
                  <p className="mt-1 line-clamp-2 text-sm text-text/80">{String(h.metadata.tagline)}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/schools/${encodeURIComponent(h.school_code)}`}
                    className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1.5 text-sm hover:bg-[color:rgb(var(--card)/0.8)]"
                  >
                    Visit Hub
                  </Link>
                  {h.immigrant_center_url && (
                    <a
                      href={h.immigrant_center_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1.5 text-sm hover:bg-[color:rgb(var(--card)/0.8)]"
                    >
                      Immigrant Center
                    </a>
                  )}
                  {h.campus_url && (
                    <a
                      href={h.campus_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1.5 text-sm hover:bg-[color:rgb(var(--card)/0.8)]"
                    >
                      Campus Site
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

