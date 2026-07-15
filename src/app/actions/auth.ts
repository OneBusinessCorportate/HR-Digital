"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type ActionState } from "@/lib/forms";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard") || "/dashboard";

  if (!email || !password) {
    return { ok: false, error: "Введите email и пароль" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "Неверный email или пароль" };
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
