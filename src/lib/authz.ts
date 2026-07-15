import type { Enums } from "@/lib/types/database";

export interface RoleBearer {
  role: Enums<"hr_role">;
  is_active: boolean;
}

/** HR and admins may edit; managers are read-only. Inactive users cannot edit. */
export function canEdit(profile: RoleBearer | null | undefined): boolean {
  return !!profile && profile.is_active && (profile.role === "admin" || profile.role === "hr");
}

/** Any active profile is considered staff (may read candidate data). */
export function isStaff(profile: RoleBearer | null | undefined): boolean {
  return !!profile && profile.is_active;
}
