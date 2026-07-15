"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createCandidate } from "@/app/actions/candidates";
import { initialActionState } from "@/lib/forms";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { FormMessage, SubmitButton } from "@/components/ui/action-form";
import { SOURCE_LABELS } from "@/lib/domain/constants";
import { STAGE_LABELS, PIPELINE_STAGES } from "@/lib/domain/funnel";
import { DUPLICATE_REASON_LABELS, type DuplicateReason } from "@/lib/domain/duplicates";

export function NewCandidateForm({
  profiles,
  currentUserId,
  today,
}: {
  profiles: { id: string; label: string }[];
  currentUserId: string;
  today: string;
}) {
  const [state, formAction] = useActionState(createCandidate, initialActionState);
  const [confirm, setConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // When the user confirms duplicates, resubmit automatically.
  useEffect(() => {
    if (confirm) formRef.current?.requestSubmit();
  }, [confirm]);

  const sourceOptions = Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }));
  const stageOptions = PIPELINE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }));

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="confirm_duplicate" value={confirm ? "true" : ""} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ФИО" htmlFor="full_name" required>
          <Input id="full_name" name="full_name" required autoFocus placeholder="Иван Иванов" />
        </Field>
        <Field label="Должность" htmlFor="position">
          <Input id="position" name="position" placeholder="Менеджер по продажам" />
        </Field>
        <Field label="Телефон" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" placeholder="+374 ..." />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" placeholder="mail@example.com" />
        </Field>
        <Field label="Telegram" htmlFor="telegram">
          <Input id="telegram" name="telegram" placeholder="@username" />
        </Field>
        <Field label="Источник" htmlFor="source" required>
          <Select id="source" name="source" options={sourceOptions} defaultValue="application" />
        </Field>
        <Field label="Ссылка на резюме" htmlFor="resume_url">
          <Input id="resume_url" name="resume_url" type="url" placeholder="https://..." />
        </Field>
        <Field label="Дата первого контакта" htmlFor="first_contact_date">
          <Input id="first_contact_date" name="first_contact_date" type="date" defaultValue={today} />
        </Field>
        <Field label="Ответственный" htmlFor="responsible_user_id">
          <Select
            id="responsible_user_id"
            name="responsible_user_id"
            options={profiles.map((p) => ({ value: p.id, label: p.label }))}
            defaultValue={currentUserId}
          />
        </Field>
        <Field label="Начальный этап" htmlFor="stage">
          <Select id="stage" name="stage" options={stageOptions} defaultValue="first_contact" />
        </Field>
        <Field label="Следующий шаг" htmlFor="next_action">
          <Input id="next_action" name="next_action" placeholder="Отправить тест" />
        </Field>
        <Field label="Дата следующего шага" htmlFor="next_action_date">
          <Input id="next_action_date" name="next_action_date" type="date" />
        </Field>
      </div>

      <Field label="Комментарий по первому разговору" htmlFor="first_contact_comment">
        <Textarea id="first_contact_comment" name="first_contact_comment" rows={3} />
      </Field>

      {state.duplicates && state.duplicates.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            ⚠ Найдены возможные дубликаты ({state.duplicates.length}). Проверьте, что это новая заявка.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {state.duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/candidates/${d.id}`} target="_blank" className="font-medium text-amber-900 underline">
                  {d.full_name}
                </Link>
                <span className="text-xs text-amber-700">
                  {d.reasons.map((r) => DUPLICATE_REASON_LABELS[r as DuplicateReason] ?? r).join(", ")}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="btn-secondary mt-3"
          >
            Всё равно создать нового кандидата
          </button>
        </div>
      ) : null}

      <FormMessage state={state} />

      <div className="flex items-center gap-2">
        <SubmitButton>Создать кандидата</SubmitButton>
        <Link href="/candidates" className="btn-ghost">Отмена</Link>
      </div>
    </form>
  );
}
