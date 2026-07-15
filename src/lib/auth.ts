import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";
import { canEdit as canEditRole } from "@/lib/authz";

export type Profile = Tables<"hr_profiles">;

/** The current auth user + their profile, or null if unauthenticated. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("hr_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile ?? null;
}

/** Require an authenticated, active staff member. Redirects to /login otherwise. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) {
    redirect("/login");
  }
  return profile;
}

export function canEdit(profile: Profile | null): boolean {
  return canEditRole(profile);
}

/** Require edit rights (HR or admin). Throws for read-only managers. */
export async function requireEditor(): Promise<Profile> {
  const profile = await requireProfile();
  if (!canEdit(profile)) {
    throw new Error("Недостаточно прав: действие доступно только HR и администраторам.");
  }
  return profile;
}
