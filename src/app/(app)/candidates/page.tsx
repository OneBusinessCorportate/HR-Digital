import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfiles, profileMap } from "@/lib/data";
import { PageHeader, EmptyState, Badge } from "@/components/ui/primitives";
import { StageBadge } from "@/components/ui/StageBadge";
import { FilterBar } from "@/components/FilterBar";
import { SOURCE_LABELS } from "@/lib/domain/constants";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/domain/funnel";
import { formatDate } from "@/lib/domain/dates";
import { filterCandidates } from "@/lib/domain/search";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
type SP = { [k: string]: string | string[] | undefined };
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireProfile();
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: allCandidates }, profiles] = await Promise.all([
    supabase.from("candidates").select("*").order("last_activity_at", { ascending: false }),
    getProfiles(),
  ]);
  const names = profileMap(profiles);
  let list = allCandidates ?? [];

  const page = Math.max(1, Number(s(sp.page)) || 1);
  list = filterCandidates(list, {
    q: s(sp.q),
    stage: s(sp.stage),
    source: s(sp.source),
    responsible: s(sp.responsible),
    outcome: s(sp.outcome),
  });

  const totalCount = list.length;
  const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paged = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") params.set(k, v);
    params.set("page", String(p));
    return `/candidates?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Кандидаты"
        subtitle={`Всего: ${totalCount}`}
        actions={<Link href="/candidates/new" className="btn-primary">+ Кандидат</Link>}
      />

      <FilterBar
        showSearch
        selects={[
          { key: "stage", placeholder: "Этап", options: STAGES.map((st) => ({ value: st, label: STAGE_LABELS[st] })) },
          { key: "source", placeholder: "Источник", options: Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })) },
          { key: "responsible", placeholder: "Ответственный", options: profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.email })) },
          {
            key: "outcome",
            placeholder: "Результат",
            options: [
              { value: "open", label: "В работе" },
              { value: "hired", label: "Принят" },
              { value: "rejected", label: "Отклонён" },
            ],
          },
        ]}
      />

      {paged.length === 0 ? (
        <EmptyState title="Кандидаты не найдены" hint="Измените фильтры или добавьте нового кандидата" />
      ) : (
        <div className="card scroll-x">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="px-4 py-3">Кандидат</th>
                <th className="px-4 py-3">Должность</th>
                <th className="px-4 py-3">Источник</th>
                <th className="px-4 py-3">Этап</th>
                <th className="px-4 py-3">Первый контакт</th>
                <th className="px-4 py-3">Активность</th>
                <th className="px-4 py-3">След. шаг</th>
                <th className="px-4 py-3">Ответственный</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {c.full_name}
                    </Link>
                    <div className="text-xs text-slate-400">{c.email ?? c.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.position ?? "—"}</td>
                  <td className="px-4 py-3"><Badge>{SOURCE_LABELS[c.source]}</Badge></td>
                  <td className="px-4 py-3"><StageBadge stage={c.stage as Stage} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.first_contact_date)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.last_activity_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{c.next_action_date ? formatDate(c.next_action_date) : <span className="text-amber-600">—</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{c.responsible_user_id ? names.get(c.responsible_user_id) ?? "—" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              className={`rounded-md px-3 py-1.5 ${p === page ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
