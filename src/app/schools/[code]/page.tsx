import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import AgentChat from "@/app/ccny/AgentChat";
import ResourceCard, { type ResourceItem, type ResourceKind, type Scope } from "@/app/components/ResourceCard";
import { createSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

function toScope(schools: string[] | null | undefined): Scope {
  const arr = (schools ?? []).map((s) => s.toLowerCase());
  if (arr.includes("national") || arr.includes("usa") || arr.includes("all")) return "national";
  if (arr.includes("cuny") || arr.includes("all-cuny")) return "cuny";
  return arr.length > 0 ? "school" : "national";
}

function parseDeadline(d?: string | null): number | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
}

export const dynamic = "force-dynamic";

export default async function SchoolHubPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const schoolCode = (code || "").toLowerCase();
  const supabase = await createSupabaseServer();

  const { data: hub } = await supabase
    .from("school_hubs")
    .select("school_code, display_name, campus_url, immigrant_center_url, metadata")
    .eq("school_code", schoolCode)
    .single();

  const title = hub?.display_name || schoolCode.toUpperCase();

  async function fetchForSchool() {
    const [sch, men, res] = await Promise.all([
      supabase
        .from("scholarships")
        .select(
          "id,name,url,description,category,authority,deadline,amount_min,amount_max,schools,created_at,status"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("mentorships")
        .select("id,name,url,description,category,authority,schools,created_at,status")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("resources")
        .select("id,name,url,description,category,authority,deadline,schools,created_at,status")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const all: ResourceItem[] = [];

    for (const r of sch.data ?? []) {
      all.push({
        id: r.id as string,
        kind: "scholarship" as ResourceKind,
        name: r.name as string,
        url: (r.url as string) ?? null,
        description: (r.description as string) ?? null,
        category: (r.category as string) ?? null,
        authority: (r.authority as string) ?? null,
        deadline: (r.deadline as string) ?? null,
        amount_min: r.amount_min as number | null,
        amount_max: r.amount_max as number | null,
        schools: (r.schools as string[]) ?? [],
        created_at: r.created_at as string,
        scope: toScope(r.schools as string[]),
      });
    }
    for (const r of men.data ?? []) {
      all.push({
        id: r.id as string,
        kind: "mentorship" as ResourceKind,
        name: r.name as string,
        url: (r.url as string) ?? null,
        description: (r.description as string) ?? null,
        category: (r.category as string) ?? null,
        authority: (r.authority as string) ?? null,
        deadline: null,
        amount_min: null,
        amount_max: null,
        schools: (r.schools as string[]) ?? [],
        created_at: r.created_at as string,
        scope: toScope(r.schools as string[]),
      });
    }
    for (const r of res.data ?? []) {
      all.push({
        id: r.id as string,
        kind: "resource" as ResourceKind,
        name: r.name as string,
        url: (r.url as string) ?? null,
        description: (r.description as string) ?? null,
        category: (r.category as string) ?? null,
        authority: (r.authority as string) ?? null,
        deadline: (r.deadline as string) ?? null,
        amount_min: null,
        amount_max: null,
        schools: (r.schools as string[]) ?? [],
        created_at: r.created_at as string,
        scope: toScope(r.schools as string[]),
      });
    }

    const lower = schoolCode.toLowerCase();
    const scoped = all.filter(
      (i) => i.scope === "cuny" || (i.schools || []).map((s) => s.toLowerCase()).includes(lower)
    );

    const featured = scoped.slice(0, 6);
    const now = Date.now();
    const upcoming = scoped
      .map((i) => ({ item: i, d: parseDeadline(i.deadline) }))
      .filter((x) => x.d && x.d >= now)
      .sort((a, b) => (a.d! - b.d!))
      .slice(0, 6)
      .map((x) => x.item);

    return { featured, upcoming } as { featured: ResourceItem[]; upcoming: ResourceItem[] };
  }

  const { featured, upcoming } = await fetchForSchool();

  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      {/* Subtle gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(45,190,133,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.18),transparent_55%)]"
      />

      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero + quick links */}
        <section className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-heading">{title}</h1>
          <p className="mt-1 text-sm text-text/80">
            Immigrant student hub — curated resources, deadlines, and school links.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hub?.campus_url && (
              <a
                className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1.5 text-sm hover:bg-[color:rgb(var(--card)/0.8)]"
                href={hub.campus_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Campus site
              </a>
            )}
            {hub?.immigrant_center_url && (
              <a
                className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1.5 text-sm hover:bg-[color:rgb(var(--card)/0.8)]"
                href={hub.immigrant_center_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Immigrant Student Center
              </a>
            )}
            <Link
              className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1.5 text-sm hover:bg-[color:rgb(var(--card)/0.8)]"
              href={`/resources?school=${encodeURIComponent(schoolCode)}`}
            >
              Browse all resources
            </Link>
            <Link
              className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1.5 text-sm hover:bg-[color:rgb(var(--card)/0.8)]"
              href={`/schools/${encodeURIComponent(schoolCode)}/submit`}
            >
              Submit a resource
            </Link>
          </div>
        </section>

        {/* Ask the Agent */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-heading">Ask the Agent</h2>
          <p className="mt-1 text-sm text-text/80">
            Ask about in-state tuition, NYS DREAM Act/TAP, scholarships, grants, or school resources.
          </p>
          <div className="mt-3">
            {schoolCode === "ccny" ? (
              <AgentChat />
            ) : (
              <div className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 text-sm text-text/80">
                School-specific agent chat is coming soon for {title}. In the meantime, explore resources below.
              </div>
            )}
          </div>
        </section>

        {/* Featured resources */}
        <section className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-heading">Featured resources</h2>
            <Link className="text-sm underline underline-offset-4" href="/resources">
              View directory
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="mt-2 text-sm text-text/70">No featured items yet.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((it) => (
                <ResourceCard key={`${it.kind}-${it.id}`} item={it} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming deadlines */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-heading">Upcoming deadlines</h2>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-text/70">No upcoming deadlines found.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((it) => (
                <ResourceCard key={`${it.kind}-${it.id}`} item={it} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
