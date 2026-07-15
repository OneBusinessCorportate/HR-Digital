"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { initialActionState } from "@/lib/forms";
import { Field, Input } from "@/components/ui/fields";
import { FormMessage, SubmitButton } from "@/components/ui/action-form";

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialActionState);
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/dashboard";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirect} />
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@ob.local" />
      </Field>
      <Field label="Пароль" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingLabel="Вход…">
        Войти
      </SubmitButton>
    </form>
  );
}
