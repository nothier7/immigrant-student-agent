import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ResourceCard, { type ResourceItem, type ResourceKind, type Scope } from "@/app/components/ResourceCard";
import ResourceReport from "@/app/components/ResourceReport";
import ResourceSaveButton from "@/app/components/ResourceSaveButton";
import ReminderPanel from "@/app/components/ReminderPanel";
import ShareLinkButton from "@/app/components/ShareLinkButton";
import { createSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import type { Metadata } from "next";

type Params = { kind: ResourceKind; id: string };

function toScope(schools: string[] | null | undefined): Scope {
  const arr = (schools ?? []).map((s) => s.toLowerCase());
  if (arr.includes("national") || arr.includes("usa") || arr.includes("all")) return "national";
  if (arr.includes("cuny") || arr.includes("all-cuny")) return "cuny";
  return arr.length > 0 ? "school" : "national";
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString();
}

async function fetchResource(kind: ResourceKind, id: string) {
  const supabase = await createSupabaseServer();
  const table = kind === "scholarship" ? "scholarships" : kind === "mentorship" ? "mentorships" : "resources";
  const { data } = await supabase
    .from(table)
    .select(
      "id,name,url,description,category,authority,deadline,amount_min,amount_max,schools,created_at,status"
    )
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    id: data.id as string,
    kind,
    name: data.name as string,
    url: (data.url as string) ?? null,
    description: (data.description as string) ?? null,
    category: (data.category as string) ?? null,
    authority: (data.authority as string) ?? null,
    deadline: (data.deadline as string) ?? null,
    amount_min: (data.amount_min as number) ?? null,
    amount_max: (data.amount_max as number) ?? null,
    schools: (data.schools as string[]) ?? [],
    created_at: data.created_at as string,
    scope: toScope(data.schools as string[]),
  } as ResourceItem;
}

async function fetchRelated(kind: ResourceKind, item: ResourceItem) {
  const supabase = await createSupabaseServer();
  const table = kind === "scholarship" ? "scholarships" : kind === "mentorship" ? "mentorships" : "resources";
  const query = supabase
    .from(table)
    .select(
      "id,name,url,description,category,authority,deadline,amount_min,amount_max,schools,created_at,status"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  if (item.category) query.eq("category", item.category);
  const { data } = await query;
  const list = (data ?? [])
    .filter((r) => String(r.id) !== item.id)
    .slice(0, 4)
    .map(
      (r) =>
        ({
          id: r.id as string,
          kind,
          name: r.name as string,
          url: (r.url as string) ?? null,
          description: (r.description as string) ?? null,
          category: (r.category as string) ?? null,
          authority: (r.authority as string) ?? null,
          deadline: (r.deadline as string) ?? null,
          amount_min: (r.amount_min as number) ?? null,
          amount_max: (r.amount_max as number) ?? null,
          schools: (r.schools as string[]) ?? [],
          created_at: r.created_at as string,
          scope: toScope(r.schools as string[]),
        }) as ResourceItem
    );

  return list;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { kind, id } = await params;
  const item = await fetchResource(kind, id);
  if (!item) {
    return { title: "Resource not found" };
  }
  return {
    title: `${item.name} · ${item.kind}`,
    description: item.description || `Resource details for ${item.name}.`,
  };
}

export default async function ResourceDetailPage({ params }: { params: Promise<Params> }) {
  const { kind, id } = await params;
  const item = await fetchResource(kind, id);

  if (!item) {
    return (
      <div className="relative min-h-dvh bg-bg text-text antialiased">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold text-heading">Resource not found</h1>
          <p className="mt-2 text-sm text-text/70">Try returning to the directory.</p>
          <Link className="mt-4 inline-flex text-sm underline underline-offset-4" href="/resources">
            Back to directory
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const related = await fetchRelated(kind, item);

  const detailUrl = `/resources/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.id)}`;

  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(45,190,133,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.18),transparent_55%)]"
      />
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-text/60">{item.kind}</p>
            <h1 className="mt-1 text-2xl font-semibold text-heading">{item.name}</h1>
            {item.authority && <p className="mt-1 text-sm text-text/70">Authority: {item.authority}</p>}
          </div>
          <div className="flex items-center gap-2">
            <ResourceSaveButton id={item.id} kind={item.kind} name={item.name} url={item.url} deadline={item.deadline} />
            <ShareLinkButton url={detailUrl} />
            <ResourceReport kind={item.kind} id={item.id} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold text-heading">Overview</h2>
              {item.description ? (
                <p className="mt-2 text-sm text-text/80">{item.description}</p>
              ) : (
                <p className="mt-2 text-sm text-text/60">No description provided yet.</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-text/70">
                {item.category && (
                  <span className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1">
                    Category: {item.category}
                  </span>
                )}
                {item.deadline && (
                  <span className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1">
                    Deadline: {formatDate(item.deadline)}
                  </span>
                )}
                <span className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-2 py-1">
                  Added: {formatDate(item.created_at) || "Unknown"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1 text-xs hover:bg-[color:rgb(var(--card)/0.8)]"
                  >
                    Open official link
                  </a>
                )}
                <Link
                  href="/resources"
                  className="rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1 text-xs hover:bg-[color:rgb(var(--card)/0.8)]"
                >
                  Back to directory
                </Link>
              </div>
            </div>

            {related.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-heading">Related resources</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {related.map((r) => (
                    <ResourceCard key={`${r.kind}-${r.id}`} item={r} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-4">
            <ReminderPanel resource={{ id: item.id, kind: item.kind, name: item.name, url: item.url, deadline: item.deadline }} />
            <div className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 text-xs text-text/70">
              This information is for guidance only. Always verify deadlines and eligibility with official sources.
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

