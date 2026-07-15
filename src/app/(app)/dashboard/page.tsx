import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getRecruitmentData, getProfiles } from "@/lib/data";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader, StatCard, SectionCard, EmptyState, RatioBar } from "@/components/ui/primitives";
import { resolvePeriod, formatDateTime, type PeriodPreset } from "@/lib/domain/dates";
import {
  computeFunnelCounts,
  computeConversions,
  computeSourcePerformance,
  computeWorkVolume,
  computeOverdue,
  firstMonthRetention,
  formatRatio,
} from "@/lib/domain/metrics";
import { SOURCE_LABELS } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const [data, profiles] = await Promise.all([getRecruitmentData(), getProfiles()]);

  const period = (typeof sp.period === "string" ? sp.period : "month") as PeriodPreset;
  const range = resolvePeriod(period, new Date(), undefined, {
    from: typeof sp.from === "string" ? sp.from : undefined,
    to: typeof sp.to === "string" ? sp.to : undefined,
  });
  const sourceFilter = typeof sp.source === "string" ? sp.source : "";
  const responsibleFilter = typeof sp.responsible === "string" ? sp.responsible : "";
  const positionFilter = typeof sp.position === "string" ? sp.position : "";

  // Apply attribute filters to the candidate set; related rows follow candidate ids.
  let candidates = data.candidates;
  if (sourceFilter) candidates = candidates.filter((c) => c.source === sourceFilter);
  if (responsibleFilter) candidates = candidates.filter((c) => c.responsible_user_id === responsibleFilter);
  if (positionFilter) candidates = candidates.filter((c) => c.position === positionFilter);
  const ids = new Set(candidates.map((c) => c.id));
  const byCand = <T extends { candidate_id: string }>(rows: T[]) => rows.filter((r) => ids.has(r.candidate_id));

  const scoped = {
    candidates,
    history: byCand(data.history),
    tests: byCand(data.tests),
    interviews: byCand(data.interviews),
    evaluations: byCand(data.evaluations),
    offers: byCand(data.offers),
    probations: byCand(data.probations),
  };

  const counts = computeFunnelCounts(scoped, range);
  const conversions = computeConversions(scoped.candidates, scoped.history, scoped.probations);
  const sources = computeSourcePerformance(scoped.candidates, scoped.history, scoped.probations);
  const retention = firstMonthRetention(scoped.candidates, scoped.probations);
  const overdue = computeOverdue(scoped);

  // Team + Inga work volume (activity within period).
  const teamVolume = computeWorkVolume(data.activity, range);
  const hrProfile = profiles.find((p) => p.role === "hr");
  const ingaVolume = hrProfile ? computeWorkVolume(data.activity, range, hrProfile.id) : null;

  const upcoming = data.interviews
    .filter((i) => i.status === "scheduled" && new Date(i.scheduled_start) >= new Date())
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
    .slice(0, 6);
  const candName = (cid: string) => data.candidates.find((c) => c.id === cid)?.full_name ?? "—";

  const positions = Array.from(new Set(data.candidates.map((c) => c.position).filter(Boolean))) as string[];

  const cards = [
    { label: "Новые кандидаты", value: counts.newContacts },
    { label: "Тесты отправлены", value: counts.testsSent },
    { label: "Тесты пройдены", value: counts.testsCompleted },
    { label: "Прошли тест", value: counts.testsPassed },
    { label: "Собеседований назначено", value: counts.interviewsScheduled },
    { label: "Собеседований проведено", value: counts.interviewsCompleted },
    { label: "Оценок проведено", value: counts.evaluationsCompleted },
    { label: "Офферов отправлено", value: counts.offersSent },
    { label: "Принято", value: counts.hires },
    { label: "Начато исп. сроков", value: counts.probationStarts },
    { label: "Удержаны 1-й месяц", value: counts.retainedFirstMonth },
  ];

  const conversionRows = [
    { label: "Первый контакт → Тест", r: conversions.contactToTest },
    { label: "Тест → Отбор", r: conversions.testToSelection },
    { label: "Отбор → Собеседование", r: conversions.selectionToInterview },
    { label: "Собеседование → Оффер", r: conversions.interviewToOffer },
    { label: "Оффер → Найм", r: conversions.offerToHire },
    { label: "Найм → Удержание (1 мес.)", r: conversions.hireToRetained },
  ];

  const overdueItems = [
    { label: "Без следующего шага", n: overdue.noNextAction.length },
    { label: "Просроченные касания", n: overdue.overdueFollowUps.length },
    { label: "Собеседования без результата", n: overdue.interviewsAwaitingResult.length },
    { label: "Ожидают оценки", n: overdue.awaitingEvaluation.length },
    { label: "Исп. срок: нужно решение", n: overdue.probationNeedsDecision.length },
  ];

  return (
    <>
      <PageHeader
        title={`Здравствуйте, ${profile.full_name ?? profile.email}`}
        subtitle="Обзор процесса найма в реальном времени"
        actions={
          <Link href="/candidates/new" className="btn-primary">
            + Кандидат
          </Link>
        }
      />

      <FilterBar
        selects={[
          { key: "source", placeholder: "Источник", options: Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })) },
          { key: "responsible", placeholder: "Ответственный", options: profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.email })) },
          ...(positions.length ? [{ key: "position", placeholder: "Должность", options: positions.map((p) => ({ value: p, label: p })) }] : []),
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Конверсия по воронке">
          <div className="space-y-4">
            {conversionRows.map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-semibold text-slate-900">{formatRatio(row.r)}</span>
                </div>
                <div className="mt-1"><RatioBar percent={row.r.percent} label="" /></div>
              </div>
            ))}
            <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              Удержание после 1-го месяца: <b>{formatRatio(retention)}</b>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Требуют внимания">
          <ul className="space-y-2">
            {overdueItems.map((o) => (
              <li key={o.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span className="text-slate-600">{o.label}</span>
                <span className={`font-semibold ${o.n > 0 ? "text-rose-600" : "text-slate-400"}`}>{o.n}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Ближайшие собеседования" actions={<Link href="/interviews" className="text-sm text-brand-600">Все →</Link>}>
          {upcoming.length ? (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <Link href={`/candidates/${i.candidate_id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {candName(i.candidate_id)}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {formatDateTime(i.scheduled_start)} {!i.meet_link && i.format === "google_meet" ? "· ⚠ нет ссылки" : ""}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{i.duration_minutes} мин</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Нет запланированных собеседований" />
          )}
        </SectionCard>

        <SectionCard
          title="Эффективность источников"
          actions={<Link href="/reports" className="text-sm text-brand-600">Отчёты →</Link>}
        >
          {sources.length ? (
            <div className="scroll-x">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400">
                    <th className="pb-2">Источник</th>
                    <th className="pb-2 text-center">Канд.</th>
                    <th className="pb-2 text-center">Собес.</th>
                    <th className="pb-2 text-center">Найм</th>
                    <th className="pb-2 text-center">Конв.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((s) => (
                    <tr key={s.source}>
                      <td className="py-2 text-slate-700">{SOURCE_LABELS[s.source as keyof typeof SOURCE_LABELS] ?? s.source}</td>
                      <td className="py-2 text-center">{s.candidates}</td>
                      <td className="py-2 text-center">{s.interviews}</td>
                      <td className="py-2 text-center">{s.hires}</td>
                      <td className="py-2 text-center font-medium">{s.conversion.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Нет данных по источникам" />
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Объём работы HR (за период)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <WorkStat label="Инга — всего действий" value={ingaVolume?.total ?? 0} accent />
            <WorkStat label="Кандидаты" value={ingaVolume?.candidatesAdded ?? 0} />
            <WorkStat label="Контакты" value={ingaVolume?.contactsRecorded ?? 0} />
            <WorkStat label="Тесты внесены" value={ingaVolume?.testResultsRecorded ?? 0} />
            <WorkStat label="Собеседования" value={ingaVolume?.interviewsConducted ?? 0} />
            <WorkStat label="Оценки" value={ingaVolume?.evaluationsCompleted ?? 0} />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Всего действий команды за период: {teamVolume.total}. Данные основаны на зафиксированных действиях, а не на текущем этапе.
          </p>
        </SectionCard>
      </div>
    </>
  );
}

function WorkStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-brand-200 bg-brand-50" : "border-slate-100"}`}>
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
