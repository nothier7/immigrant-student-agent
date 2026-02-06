import ResourceDirectoryClient from "./ResourceDirectoryClient";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { ResourceItem, ResourceKind, Scope } from "@/app/components/ResourceCard";

function toScope(schools: string[] | null | undefined): Scope {
  const arr = (schools ?? []).map((s) => s.toLowerCase());
  if (arr.includes("national") || arr.includes("usa") || arr.includes("all")) return "national";
  if (arr.includes("cuny") || arr.includes("all-cuny")) return "cuny";
  return arr.length > 0 ? "school" : "national";
}

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const supabase = await createSupabaseServer();

  async function fetchAll() {
    try {
      const [sch, men, res] = await Promise.all([
        supabase.from("scholarships").select("id,name,url,description,category,authority,deadline,amount_min,amount_max,schools,created_at,status").eq("status", "active").order("created_at", { ascending: false }).limit(200),
        supabase.from("mentorships").select("id,name,url,description,category,authority,schools,created_at,status").eq("status", "active").order("created_at", { ascending: false }).limit(200),
        supabase.from("resources").select("id,name,url,description,category,authority,deadline,schools,created_at,status").eq("status", "active").order("created_at", { ascending: false }).limit(200),
      ]);

      const list: ResourceItem[] = [];

      if (sch.data) {
        list.push(
          ...sch.data.map((r) => ({
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
          }))
        );
      }

      if (men.data) {
        list.push(
          ...men.data.map((r) => ({
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
          }))
        );
      }

      if (res.data) {
        list.push(
          ...res.data.map((r) => ({
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
          }))
        );
      }

      return list;
    } catch {
      return [] as ResourceItem[];
    }
  }

  const initial = await fetchAll();

  // Load active CUNY schools for the school filter
  const { data: hubs } = await supabase
    .from("school_hubs")
    .select("school_code, display_name, active")
    .eq("active", true)
    .order("display_name", { ascending: true });
  const schools = (hubs ?? []).map((h) => ({ code: (h.school_code as string).toLowerCase(), name: h.display_name as string }));

  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      {/* Subtle gradient to keep parity with other pages */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(45,190,133,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.18),transparent_55%)]"
      />

      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-heading">Resource Directory</h1>
        <p className="mt-2 text-sm text-text/80">
          Filter scholarships, mentorships, and resources. Data updates as the community grows.
        </p>
        <p className="mt-1 text-xs text-text/70">También puedes explorar y buscar en español.</p>
      </main>

      <ResourceDirectoryClient initial={initial} schools={schools} />
      <Footer />
    </div>
  );
}
