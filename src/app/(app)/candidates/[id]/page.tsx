import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, canEdit } from "@/lib/auth";
import { getCandidateBundle, getProfiles, profileMap } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui/primitives";
import { StageBadge } from "@/components/ui/StageBadge";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Timeline } from "@/components/candidate/Timeline";
import {
  recordContact,
  recordTest,
  scheduleInterview,
  rescheduleInterview,
  completeInterview,
  createEvaluation,
  saveOffer,
  startProbation,
  completeProbation,
} from "@/app/actions/pipeline";
import { rejectCandidate, addNote, updateCandidate } from "@/app/actions/candidates";
import {
  SOURCE_LABELS,
  CHANNEL_LABELS,
  CONTACT_RESULT_LABELS,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_STATUS_LABELS,
  EVAL_RECOMMENDATION_LABELS,
  OFFER_STATUS_LABELS,
  OFFER_DECISION_LABELS,
  PROBATION_STATUS_LABELS,
  labelForSelect,
} from "@/lib/domain/constants";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/domain/funnel";
import { formatDate, formatDateTime, todayInputValue, toDateInputValue } from "@/lib/domain/dates";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{children}</span>
    </div>
  );
}

function Panel({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="card group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800">
        {title}
        <span className="text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </details>
  );
}

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const editable = canEdit(profile);
  const [bundle, profiles, settings] = await Promise.all([
    getCandidateBundle(id),
    getProfiles(),
    getSettings(),
  ]);
  if (!bundle) notFound();

  const c = bundle.candidate;
  const names = profileMap(profiles);
  const today = todayInputValue();
  const profileOpts = profiles.map((p) => ({ value: p.id, label: p.full_name ?? p.email }));
  const openInterviews = bundle.interviews.filter((i) => i.status === "scheduled");
  const lastTest = bundle.tests[0];

  const contactChannels = labelForSelect(CHANNEL_LABELS);
  const contactResults = labelForSelect(CONTACT_RESULT_LABELS);

  return (
    <>
      <PageHeader
        title={c.full_name}
        subtitle={c.position ?? "Должность не указана"}
        actions={
          <>
            <Link href="/candidates" className="btn-ghost">← Список</Link>
            <StageBadge stage={c.stage as Stage} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: summary + actions */}
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Профиль">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div>
                <Row label="Телефон">{c.phone ?? "—"}</Row>
                <Row label="Email">{c.email ?? "—"}</Row>
                <Row label="Telegram">{c.telegram ?? "—"}</Row>
                <Row label="Источник"><Badge>{SOURCE_LABELS[c.source]}</Badge></Row>
                <Row label="Резюме">
                  {c.resume_url ? (
                    <a href={c.resume_url} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                      Ссылка
                    </a>
                  ) : (
                    "—"
                  )}
                </Row>
              </div>
              <div>
                <Row label="Ответственный">{c.responsible_user_id ? names.get(c.responsible_user_id) ?? "—" : "—"}</Row>
                <Row label="Создан">{formatDate(c.created_at)}</Row>
                <Row label="Первый контакт">{formatDate(c.first_contact_date)}</Row>
                <Row label="Следующий шаг">{c.next_action ?? "—"}{c.next_action_date ? ` (${formatDate(c.next_action_date)})` : ""}</Row>
                <Row label="Этап"><StageBadge stage={c.stage as Stage} /></Row>
              </div>
            </div>
            {c.first_contact_comment ? (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{c.first_contact_comment}</p>
            ) : null}
          </SectionCard>

          {c.stage === "rejected" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-800">Кандидат отклонён</p>
              <div className="mt-1 text-sm text-rose-700">
                Этап: {c.rejection_stage ? STAGE_LABELS[c.rejection_stage as Stage] : "—"} · {formatDate(c.rejection_date)}
              </div>
              <p className="mt-1 text-sm text-rose-700">Причина: {c.rejection_reason}</p>
              {c.rejection_comment ? <p className="mt-1 text-sm text-rose-600">{c.rejection_comment}</p> : null}
            </div>
          ) : null}

          {/* Test result summary */}
          {lastTest ? (
            <SectionCard title="Результат теста">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Badge className={lastTest.passed ? "bg-brand-100 text-brand-700 border-brand-200" : "bg-rose-100 text-rose-700 border-rose-200"}>
                  {lastTest.passed == null ? "нет результата" : lastTest.passed ? "Пройден" : "Не пройден"}
                </Badge>
                <span>Результат: <b>{lastTest.score_percent != null ? `${lastTest.score_percent}%` : "—"}</b></span>
                <span className="text-slate-400">Порог: {lastTest.threshold_used ?? settings.testPassThreshold}%</span>
                {lastTest.is_manual_override ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">Ручное решение</Badge> : null}
              </div>
              {lastTest.comment ? <p className="mt-2 text-sm text-slate-600">{lastTest.comment}</p> : null}
            </SectionCard>
          ) : null}

          {/* Interviews */}
          {bundle.interviews.length ? (
            <SectionCard title="Собеседования">
              <div className="space-y-3">
                {bundle.interviews.map((i) => {
                  const parts = bundle.participants.filter((p) => p.interview_id === i.id);
                  return (
                    <div key={i.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">{formatDateTime(i.scheduled_start)}</span>
                        <Badge>{INTERVIEW_STATUS_LABELS[i.status]}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{INTERVIEW_FORMAT_LABELS[i.format]}</span>
                        <span>· {i.duration_minutes} мин</span>
                        {i.meet_link ? <a href={i.meet_link} target="_blank" rel="noreferrer" className="text-brand-600 underline">Meet</a> : <span className="text-amber-600">⚠ нет ссылки</span>}
                        {parts.length ? <span>· {parts.map((p) => p.name).join(", ")}</span> : <span className="text-amber-600">⚠ нет интервьюера</span>}
                      </div>
                      {i.summary ? <p className="mt-2 text-sm text-slate-600">{i.summary}</p> : null}
                      {(i.recording_url || i.transcript_url || i.transcript_text) ? (
                        <div className="mt-1 flex flex-wrap gap-3 text-xs">
                          {i.recording_url ? <a href={i.recording_url} target="_blank" rel="noreferrer" className="text-brand-600 underline">Запись</a> : null}
                          {i.transcript_url ? <a href={i.transcript_url} target="_blank" rel="noreferrer" className="text-brand-600 underline">Транскрипт</a> : null}
                          {i.transcript_text ? <span className="text-slate-400">транскрипт: текст сохранён</span> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ) : null}

          {/* Evaluations */}
          {bundle.evaluations.length ? (
            <SectionCard title="Оценка опыта">
              {bundle.evaluations.map((e) => (
                <div key={e.id} className="mb-2 rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">{EVAL_RECOMMENDATION_LABELS[e.recommendation]}</Badge>
                    <span className="font-semibold">Итог: {e.overall_score}/{e.scale_max}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500 sm:grid-cols-3">
                    <span>Опыт: {e.professional_score}</span>
                    <span>Коммуникация: {e.communication_score}</span>
                    <span>Мотивация: {e.motivation_score}</span>
                    <span>Навыки: {e.skills_score}</span>
                    <span>Культура: {e.culture_fit_score}</span>
                  </div>
                  {e.comment ? <p className="mt-2 text-slate-600">{e.comment}</p> : null}
                </div>
              ))}
            </SectionCard>
          ) : null}

          {/* Offers */}
          {bundle.offers.length ? (
            <SectionCard title="Оффер / Решение">
              {bundle.offers.map((o) => (
                <div key={o.id} className="mb-2 rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge>{OFFER_STATUS_LABELS[o.status]}</Badge>
                    {o.decision ? <span className="font-medium">{OFFER_DECISION_LABELS[o.decision]}</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {o.position ?? "—"} · {o.salary ?? "з/п не указана"} · старт: {formatDate(o.expected_start_date)}
                  </div>
                  {o.comment ? <p className="mt-1 text-slate-600">{o.comment}</p> : null}
                </div>
              ))}
            </SectionCard>
          ) : null}

          {/* Probation */}
          {bundle.probations.length ? (
            <SectionCard title="Испытательный срок">
              {bundle.probations.map((p) => (
                <div key={p.id} className="mb-2 rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge>{PROBATION_STATUS_LABELS[p.status]}</Badge>
                    {p.first_month_retained != null ? (
                      <Badge className={p.first_month_retained ? "bg-brand-100 text-brand-700 border-brand-200" : "bg-rose-100 text-rose-700 border-rose-200"}>
                        {p.first_month_retained ? "удержан 1 мес." : "не удержан"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDate(p.start_date)} → {formatDate(p.planned_end_date)}{p.actual_end_date ? ` (факт: ${formatDate(p.actual_end_date)})` : ""}
                  </div>
                  {p.comment ? <p className="mt-1 text-slate-600">{p.comment}</p> : null}
                </div>
              ))}
            </SectionCard>
          ) : null}

          {/* Action panels (HR/admin only) */}
          {editable ? (
            <div className="space-y-3">
              <h2 className="pt-2 text-sm font-semibold text-slate-500">Действия</h2>

              <Panel title="Зафиксировать контакт">
                <ActionForm action={recordContact} hidden={{ candidate_id: c.id }} submitLabel="Сохранить контакт" resetOnSuccess>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Дата и время" htmlFor="contact_at" required>
                      <Input id="contact_at" name="contact_at" type="datetime-local" defaultValue={`${today}T10:00`} required />
                    </Field>
                    <Field label="Канал" htmlFor="channel"><Select id="channel" name="channel" options={contactChannels} defaultValue="phone" /></Field>
                    <Field label="Результат" htmlFor="result"><Select id="result" name="result" options={contactResults} placeholder="—" /></Field>
                    <Field label="Дата следующего шага" htmlFor="next_action_date"><Input id="next_action_date" name="next_action_date" type="date" /></Field>
                    <Field label="Следующий шаг" htmlFor="next_action"><Input id="next_action" name="next_action" /></Field>
                  </div>
                  <Field label="Заметка" htmlFor="note"><Textarea id="note" name="note" rows={2} /></Field>
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="replied" /> Ответил</label>
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="agreed_to_continue" /> Согласен продолжить</label>
                </ActionForm>
              </Panel>

              <Panel title="Тест (отправка / результат)">
                <ActionForm action={recordTest} hidden={{ candidate_id: c.id }} submitLabel="Сохранить тест" resetOnSuccess>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Ссылка на тест" htmlFor="test_link"><Input id="test_link" name="test_link" type="url" /></Field>
                    <Field label="Дата отправки" htmlFor="sent_date"><Input id="sent_date" name="sent_date" type="date" /></Field>
                    <Field label="Дата выполнения" htmlFor="completed_date"><Input id="completed_date" name="completed_date" type="date" /></Field>
                    <Field label="Балл" htmlFor="score"><Input id="score" name="score" type="number" step="any" min="0" /></Field>
                    <Field label="Максимум (или оставьте пустым, если балл в %)" htmlFor="max_score"><Input id="max_score" name="max_score" type="number" step="any" min="1" /></Field>
                    <Field label={`Решение (порог ${settings.testPassThreshold}%)`} htmlFor="manual_passed">
                      <Select id="manual_passed" name="manual_passed" defaultValue="auto" options={[
                        { value: "auto", label: "Авто (по порогу)" },
                        { value: "pass", label: "Пройден (вручную)" },
                        { value: "fail", label: "Не пройден (вручную)" },
                      ]} />
                    </Field>
                  </div>
                  <Field label="Комментарий" htmlFor="comment"><Textarea id="comment" name="comment" rows={2} /></Field>
                </ActionForm>
              </Panel>

              <Panel title="Запланировать собеседование">
                <ActionForm action={scheduleInterview} hidden={{ candidate_id: c.id }} submitLabel="Запланировать" resetOnSuccess>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Дата" htmlFor="date" required><Input id="date" name="date" type="date" defaultValue={today} required /></Field>
                    <Field label="Время (Asia/Yerevan)" htmlFor="time" required><Input id="time" name="time" type="time" defaultValue="12:00" required /></Field>
                    <Field label="Длительность, мин" htmlFor="duration_minutes"><Input id="duration_minutes" name="duration_minutes" type="number" min="1" defaultValue={45} /></Field>
                    <Field label="Формат" htmlFor="format"><Select id="format" name="format" options={labelForSelect(INTERVIEW_FORMAT_LABELS)} defaultValue="google_meet" /></Field>
                    <Field label="Ссылка Google Meet" htmlFor="meet_link"><Input id="meet_link" name="meet_link" type="url" /></Field>
                    <Field label="Интервьюеры (через запятую)" htmlFor="interviewers"><Input id="interviewers" name="interviewers" /></Field>
                  </div>
                  <Field label="Заметки перед собеседованием" htmlFor="notes_before"><Textarea id="notes_before" name="notes_before" rows={2} /></Field>
                </ActionForm>
              </Panel>

              {openInterviews.length ? (
                <Panel title="Итоги / перенос собеседования">
                  {openInterviews.map((i) => (
                    <div key={i.id} className="mb-4 space-y-4 rounded-lg border border-slate-100 p-3">
                      <p className="text-sm font-medium text-slate-700">Собеседование {formatDateTime(i.scheduled_start)}</p>
                      <ActionForm action={completeInterview} hidden={{ interview_id: i.id }} submitLabel="Сохранить итог">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field label="Статус" htmlFor={`st-${i.id}`}>
                            <Select id={`st-${i.id}`} name="status" defaultValue="completed" options={[
                              { value: "completed", label: "Проведено" },
                              { value: "no_show", label: "Не пришёл" },
                              { value: "cancelled", label: "Отменено" },
                              { value: "rescheduled", label: "Перенесено" },
                            ]} />
                          </Field>
                          <Field label="Фактическое время" htmlFor={`as-${i.id}`}><Input id={`as-${i.id}`} name="actual_start" type="datetime-local" /></Field>
                          <Field label="Запись (URL)" htmlFor={`ru-${i.id}`}><Input id={`ru-${i.id}`} name="recording_url" type="url" /></Field>
                          <Field label="Транскрипт (URL)" htmlFor={`tu-${i.id}`}><Input id={`tu-${i.id}`} name="transcript_url" type="url" /></Field>
                          <Field label="Ожидаемая з/п" htmlFor={`es-${i.id}`}><Input id={`es-${i.id}`} name="expected_salary" /></Field>
                          <Field label="Доступность" htmlFor={`av-${i.id}`}><Input id={`av-${i.id}`} name="availability" /></Field>
                          <Field label="Уровень языка" htmlFor={`ll-${i.id}`}><Input id={`ll-${i.id}`} name="language_level" /></Field>
                          <Field label="Рекомендация" htmlFor={`rc-${i.id}`}><Input id={`rc-${i.id}`} name="recommendation" /></Field>
                        </div>
                        <Field label="Резюме встречи" htmlFor={`sm-${i.id}`}><Textarea id={`sm-${i.id}`} name="summary" rows={2} /></Field>
                        <Field label="Сильные стороны" htmlFor={`str-${i.id}`}><Textarea id={`str-${i.id}`} name="strengths" rows={2} /></Field>
                        <Field label="Сомнения" htmlFor={`cn-${i.id}`}><Textarea id={`cn-${i.id}`} name="concerns" rows={2} /></Field>
                        <Field label="Транскрипт (текст)" htmlFor={`tt-${i.id}`}><Textarea id={`tt-${i.id}`} name="transcript_text" rows={3} /></Field>
                      </ActionForm>
                      <ActionForm action={rescheduleInterview} hidden={{ interview_id: i.id }} submitLabel="Перенести" className="space-y-3 border-t border-dashed border-slate-200 pt-3">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <Field label="Новая дата" htmlFor={`rd-${i.id}`} required><Input id={`rd-${i.id}`} name="date" type="date" defaultValue={today} required /></Field>
                          <Field label="Время" htmlFor={`rt-${i.id}`} required><Input id={`rt-${i.id}`} name="time" type="time" defaultValue="12:00" required /></Field>
                          <Field label="Длительность" htmlFor={`rdu-${i.id}`}><Input id={`rdu-${i.id}`} name="duration_minutes" type="number" defaultValue={i.duration_minutes} min="1" /></Field>
                        </div>
                      </ActionForm>
                    </div>
                  ))}
                </Panel>
              ) : null}

              <Panel title="Оценка опыта">
                <ActionForm action={createEvaluation} hidden={{ candidate_id: c.id, scale_max: String(settings.evaluationScaleMax) }} submitLabel="Сохранить оценку" resetOnSuccess>
                  <p className="text-xs text-slate-400">Шкала 1–{settings.evaluationScaleMax}.</p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field label="Опыт" htmlFor="professional_score"><Input id="professional_score" name="professional_score" type="number" min="1" max={settings.evaluationScaleMax} required /></Field>
                    <Field label="Коммуникация" htmlFor="communication_score"><Input id="communication_score" name="communication_score" type="number" min="1" max={settings.evaluationScaleMax} required /></Field>
                    <Field label="Мотивация" htmlFor="motivation_score"><Input id="motivation_score" name="motivation_score" type="number" min="1" max={settings.evaluationScaleMax} required /></Field>
                    <Field label="Навыки" htmlFor="skills_score"><Input id="skills_score" name="skills_score" type="number" min="1" max={settings.evaluationScaleMax} required /></Field>
                    <Field label="Культура/команда" htmlFor="culture_fit_score"><Input id="culture_fit_score" name="culture_fit_score" type="number" min="1" max={settings.evaluationScaleMax} required /></Field>
                    <Field label="Итог" htmlFor="overall_score"><Input id="overall_score" name="overall_score" type="number" min="1" max={settings.evaluationScaleMax} required /></Field>
                  </div>
                  <Field label="Рекомендация" htmlFor="recommendation"><Select id="recommendation" name="recommendation" options={labelForSelect(EVAL_RECOMMENDATION_LABELS)} defaultValue="proceed" /></Field>
                  <Field label="Комментарий" htmlFor="eval_comment"><Textarea id="eval_comment" name="comment" rows={2} /></Field>
                </ActionForm>
              </Panel>

              <Panel title="Оффер / финальное решение">
                <ActionForm action={saveOffer} hidden={{ candidate_id: c.id }} submitLabel="Сохранить оффер" resetOnSuccess>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Статус оффера" htmlFor="offer_status"><Select id="offer_status" name="status" options={labelForSelect(OFFER_STATUS_LABELS)} defaultValue="not_prepared" /></Field>
                    <Field label="Решение" htmlFor="decision"><Select id="decision" name="decision" options={labelForSelect(OFFER_DECISION_LABELS)} placeholder="—" /></Field>
                    <Field label="Дата решения" htmlFor="decision_date"><Input id="decision_date" name="decision_date" type="date" /></Field>
                    <Field label="Предлагаемая должность" htmlFor="offer_position"><Input id="offer_position" name="position" defaultValue={c.position ?? ""} /></Field>
                    <Field label="Предлагаемая з/п" htmlFor="salary"><Input id="salary" name="salary" /></Field>
                    <Field label="Ожидаемая дата выхода" htmlFor="expected_start_date"><Input id="expected_start_date" name="expected_start_date" type="date" /></Field>
                  </div>
                  <Field label="Комментарий" htmlFor="offer_comment"><Textarea id="offer_comment" name="comment" rows={2} /></Field>
                </ActionForm>
              </Panel>

              <Panel title="Испытательный срок — начать">
                <ActionForm action={startProbation} hidden={{ candidate_id: c.id }} submitLabel="Начать испытательный срок" resetOnSuccess>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Дата начала" htmlFor="start_date" required><Input id="start_date" name="start_date" type="date" defaultValue={today} required /></Field>
                    <Field label="Плановая дата окончания" htmlFor="planned_end_date"><Input id="planned_end_date" name="planned_end_date" type="date" /></Field>
                    <Field label="Ответственный менеджер" htmlFor="manager_id"><Select id="manager_id" name="manager_id" options={profileOpts} placeholder="—" /></Field>
                  </div>
                  <Field label="Комментарий" htmlFor="prob_comment"><Textarea id="prob_comment" name="comment" rows={2} /></Field>
                </ActionForm>
              </Panel>

              {bundle.probations.filter((p) => p.status === "in_progress").length ? (
                <Panel title="Испытательный срок — завершить">
                  {bundle.probations.filter((p) => p.status === "in_progress").map((p) => (
                    <ActionForm key={p.id} action={completeProbation} hidden={{ probation_id: p.id }} submitLabel="Завершить">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Статус" htmlFor={`ps-${p.id}`}>
                          <Select id={`ps-${p.id}`} name="status" defaultValue="passed" options={[
                            { value: "passed", label: "Прошёл" },
                            { value: "failed", label: "Не прошёл" },
                            { value: "resigned", label: "Уволился" },
                            { value: "terminated", label: "Прекращён компанией" },
                          ]} />
                        </Field>
                        <Field label="Фактическая дата окончания" htmlFor={`pe-${p.id}`}><Input id={`pe-${p.id}`} name="actual_end_date" type="date" /></Field>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="first_month_retained" defaultChecked /> Удержан после первого месяца</label>
                      <Field label="Финальное решение" htmlFor={`pf-${p.id}`}><Input id={`pf-${p.id}`} name="final_decision" /></Field>
                      <Field label="Комментарий" htmlFor={`pc-${p.id}`}><Textarea id={`pc-${p.id}`} name="comment" rows={2} /></Field>
                    </ActionForm>
                  ))}
                </Panel>
              ) : null}

              {c.stage !== "rejected" ? (
                <Panel title="Отклонить кандидата">
                  <ActionForm action={rejectCandidate} hidden={{ candidate_id: c.id }} submitLabel="Отклонить">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Этап отклонения" htmlFor="rejection_stage" required>
                        <Select id="rejection_stage" name="rejection_stage" defaultValue={c.stage} options={STAGES.filter((s) => s !== "rejected").map((s) => ({ value: s, label: STAGE_LABELS[s] }))} />
                      </Field>
                      <Field label="Дата" htmlFor="rejection_date" required><Input id="rejection_date" name="rejection_date" type="date" defaultValue={today} required /></Field>
                    </div>
                    <Field label="Причина" htmlFor="rejection_reason" required><Input id="rejection_reason" name="rejection_reason" required /></Field>
                    <Field label="Комментарий" htmlFor="rejection_comment"><Textarea id="rejection_comment" name="rejection_comment" rows={2} /></Field>
                  </ActionForm>
                </Panel>
              ) : null}

              <Panel title="Редактировать профиль">
                <ActionForm action={updateCandidate} hidden={{ candidate_id: c.id, stage: c.stage }} submitLabel="Сохранить изменения">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="ФИО" htmlFor="e_full_name" required><Input id="e_full_name" name="full_name" defaultValue={c.full_name} required /></Field>
                    <Field label="Должность" htmlFor="e_position"><Input id="e_position" name="position" defaultValue={c.position ?? ""} /></Field>
                    <Field label="Телефон" htmlFor="e_phone"><Input id="e_phone" name="phone" defaultValue={c.phone ?? ""} /></Field>
                    <Field label="Email" htmlFor="e_email"><Input id="e_email" name="email" type="email" defaultValue={c.email ?? ""} /></Field>
                    <Field label="Telegram" htmlFor="e_telegram"><Input id="e_telegram" name="telegram" defaultValue={c.telegram ?? ""} /></Field>
                    <Field label="Источник" htmlFor="e_source"><Select id="e_source" name="source" options={labelForSelect(SOURCE_LABELS)} defaultValue={c.source} /></Field>
                    <Field label="Ссылка на резюме" htmlFor="e_resume"><Input id="e_resume" name="resume_url" type="url" defaultValue={c.resume_url ?? ""} /></Field>
                    <Field label="Дата первого контакта" htmlFor="e_fcd"><Input id="e_fcd" name="first_contact_date" type="date" defaultValue={toDateInputValue(c.first_contact_date)} /></Field>
                    <Field label="Ответственный" htmlFor="e_resp"><Select id="e_resp" name="responsible_user_id" options={profileOpts} defaultValue={c.responsible_user_id ?? ""} placeholder="—" /></Field>
                    <Field label="Следующий шаг" htmlFor="e_na"><Input id="e_na" name="next_action" defaultValue={c.next_action ?? ""} /></Field>
                    <Field label="Дата следующего шага" htmlFor="e_nad"><Input id="e_nad" name="next_action_date" type="date" defaultValue={toDateInputValue(c.next_action_date)} /></Field>
                  </div>
                  <Field label="Комментарий первого контакта" htmlFor="e_fcc"><Textarea id="e_fcc" name="first_contact_comment" rows={2} defaultValue={c.first_contact_comment ?? ""} /></Field>
                </ActionForm>
              </Panel>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Режим только для чтения. Изменения доступны HR и администраторам.
            </div>
          )}
        </div>

        {/* Right: notes + timeline */}
        <div className="space-y-5">
          <SectionCard title="Заметки">
            {editable ? (
              <ActionForm action={addNote} hidden={{ candidate_id: c.id }} submitLabel="Добавить" resetOnSuccess className="mb-4 space-y-2">
                <Textarea name="body" rows={2} placeholder="Новая заметка…" required />
              </ActionForm>
            ) : null}
            {bundle.notes.length ? (
              <ul className="space-y-3">
                {bundle.notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="whitespace-pre-wrap text-slate-700">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {n.created_by ? names.get(n.created_by) ?? "" : ""} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Заметок пока нет" />
            )}
          </SectionCard>

          <SectionCard title="История и активность">
            <Timeline events={bundle.activity} names={names} />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
