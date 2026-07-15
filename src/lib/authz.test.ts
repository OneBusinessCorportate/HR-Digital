import { describe, it, expect } from "vitest";
import { canEdit, isStaff } from "./authz";

describe("authorization", () => {
  it("allows admins and HR to edit", () => {
    expect(canEdit({ role: "admin", is_active: true })).toBe(true);
    expect(canEdit({ role: "hr", is_active: true })).toBe(true);
  });
  it("makes managers read-only", () => {
    expect(canEdit({ role: "manager", is_active: true })).toBe(false);
  });
  it("denies inactive and anonymous users", () => {
    expect(canEdit({ role: "hr", is_active: false })).toBe(false);
    expect(canEdit(null)).toBe(false);
  });
  it("treats any active profile as staff", () => {
    expect(isStaff({ role: "manager", is_active: true })).toBe(true);
    expect(isStaff(null)).toBe(false);
  });
});
