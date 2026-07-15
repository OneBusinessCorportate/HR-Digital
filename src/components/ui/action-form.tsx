"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { initialActionState, type ActionState } from "@/lib/forms";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel = "Сохранение…",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
        {state.message}
      </p>
    );
  }
  return null;
}

type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Generic form wrapper: binds a server action via useActionState, shows success/
 * error messages, refreshes server data on success and optionally resets fields.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Сохранить",
  hidden,
  resetOnSuccess = false,
  className = "space-y-4",
  footer,
}: {
  action: ServerAction;
  children: ReactNode;
  submitLabel?: string;
  hidden?: Record<string, string>;
  resetOnSuccess?: boolean;
  className?: string;
  footer?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      if (resetOnSuccess) formRef.current?.reset();
    }
  }, [state, router, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {hidden
        ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      {children}
      <FormMessage state={state} />
      <div className="flex items-center gap-2">
        {footer}
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
