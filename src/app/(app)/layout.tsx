import { requireProfile, canEdit } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        role={profile.role}
        fullName={profile.full_name ?? profile.email}
        email={profile.email}
        canEdit={canEdit(profile)}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
