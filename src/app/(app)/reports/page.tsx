import { requireProfile } from "@/lib/auth";
import { getRecruitmentData, getProfiles } from "@/lib/data";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader, SectionCard, StatCard } from "@/components/ui/primitives";
import { resolvePeriod, type PeriodPreset } from "@/lib/domain/dates";
import {
  computeConversions,
  computeSourcePerformance,
  computeWorkVolume,
  computeTimeMetrics,
  firstMonthRetention,
  formatRatio,
} from "@/lib/domain/metrics";
import { SOURCE_LABELS } from "@/lib/domain/constants";
import { STAGE_SHORT_LABELS, type Stage } from "@/lib/domain/funnel";

export const dynamic = "force-dynamic";
type SP = { [k: string]: string | string[] | undefined };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireProfile();
  const sp = await searchParams;
  const [data, profiles] = await Promise.all([getRecruitmentData(), getProfiles()]);

  const period = (typeof sp.period === "string" ? sp.period : "month") as PeriodPreset;
  const range = resolvePeriod(period, new Date(), undefined, {
    from: typeof sp.from === "string" ? sp.from : undefined,
    to: typeof sp.to === "string" ? sp.to : undefined,
  });

  const conversions = computeConversions(data.candidates, data.history, data.probations);
  const sources = computeSourcePerformance(data.candidates, data.history, data.probations);
  const retention = firstMonthRetention(data.candidates, data.probations);
  const time = computeTimeMetrics(data.candidates, data.history, data.interviews);

  const staff = profiles.filter((p) => p.role === "hr" || p.role === "admin");
  const perUser = staff.map((p) => ({
    name: p.full_name ?? p.email,
    v: computeWorkVolume(data.activity, range, p.id),
  }));
  const team = computeWorkVolume(data.activity, range);

  const effectiveness = [
    { label: "Контакт → Тест", r: conversions.contactToTest },
    { label: "Прохождение теста", r: conversions.testToSelection },
    { label: "Отбор → Собеседование", r: conversions.selectionToInterview },
    { label: "Собеседование → Оффер", r: conversions.interviewToOffer },
    { label: "Принятие оффера (найм)", r: conversions.offerToHire },
    { label: "Удержание 1-й месяц", r: retention },
  ];

  const volumeRows: { label: string; key: keyof typeof team }[] = [
    { label: "Кандидаты добавлены", key: "candidatesAdded" },
    { label: "Контакты зафиксированы", key: "contactsRecorded" },
    { label: "Повторные касания", key: "followUps" },
    { label: "Смены этапа", key: "stageChanges" },
    { label: "Тесты отправлены", key: "testsSent" },
    { label: "Результаты тестов", key: "testResultsRecorded" },
    { label: "Собеседования назначены", key: "interviewsScheduled" },
    { label: "Собеседования проведены", key: "interviewsConducted" },
    { label: "Оценки", key: "evaluationsCompleted" },
    { label: "Офферы", key: "offersRecorded" },
    { label: "Финальные решения", key: "finalDecisions" },
    { label: "Испытательные сроки", key: "probationStarts" },
  ];

  return (
    <>
      <PageHeader title="Отчёты" subtitle="Объём работы и эффективность найма" />
      <FilterBar />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Действий команды" value={team.total} accent />
        <StatCard label="Ср. контакт→собес., дн." value={time.avgContactToInterviewDays ?? "—"} />
        <StatCard label="Ср. контакт→найм, дн." value={time.avgContactToHireDays ?? "—"} />
        <StatCard label="Удержание 1-й мес." value={`${retention.percent}%`} hint={formatRatio(retention)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Эффективность (с числителем/знаменателем)">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {effectiveness.map((e) => (
                <tr key={e.label}>
                  <td className="py-2 text-slate-600">{e.label}</td>
                  <td className="py-2 text-right font-semibold text-slate-900">{formatRatio(e.r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Среднее время на этапе (дн.)">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {time.avgStageDurations.map((d) => (
                <tr key={d.stage}>
                  <td className="py-2 text-slate-600">{STAGE_SHORT_LABELS[d.stage as Stage]}</td>
                  <td className="py-2 text-right font-medium">
                    {d.avgDays ?? "—"} <span className="text-xs text-slate-400">({d.samples})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <SectionCard title="Объём работы по сотрудникам (за период)" className="mt-6">
        <div className="scroll-x">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="py-2 pr-3">Показатель</th>
                {perUser.map((u) => (
                  <th key={u.name} className="py-2 px-2 text-center">{u.name}</th>
                ))}
                <th className="py-2 px-2 text-center">Команда</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {volumeRows.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3 text-slate-600">{row.label}</td>
                  {perUser.map((u) => (
                    <td key={u.name} className="py-2 px-2 text-center">{u.v[row.key]}</td>
                  ))}
                  <td className="py-2 px-2 text-center font-medium">{team[row.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Эффективность источников" className="mt-6">
        <div className="scroll-x">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="py-2">Источник</th>
                <th className="py-2 text-center">Кандидаты</th>
                <th className="py-2 text-center">Собеседования</th>
                <th className="py-2 text-center">Найм</th>
                <th className="py-2 text-center">Удержаны</th>
                <th className="py-2 text-center">Конверсия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((s) => (
                <tr key={s.source}>
                  <td className="py-2 text-slate-700">{SOURCE_LABELS[s.source as keyof typeof SOURCE_LABELS] ?? s.source}</td>
                  <td className="py-2 text-center">{s.candidates}</td>
                  <td className="py-2 text-center">{s.interviews}</td>
                  <td className="py-2 text-center">{s.hires}</td>
                  <td className="py-2 text-center">{s.retained}</td>
                  <td className="py-2 text-center font-medium">{formatRatio(s.conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
