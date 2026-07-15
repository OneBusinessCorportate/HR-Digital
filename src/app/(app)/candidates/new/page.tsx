import { requireEditor } from "@/lib/auth";
import { getProfiles } from "@/lib/data";
import { PageHeader, Card } from "@/components/ui/primitives";
import { todayInputValue } from "@/lib/domain/dates";
import { NewCandidateForm } from "./new-candidate-form";

export const dynamic = "force-dynamic";

export default async function NewCandidatePage() {
  const profile = await requireEditor();
  const profiles = await getProfiles();

  return (
    <>
      <PageHeader title="Новый кандидат" subtitle="Заполните основные данные — это займёт меньше минуты" />
      <Card className="max-w-3xl">
        <NewCandidateForm
          profiles={profiles.map((p) => ({ id: p.id, label: p.full_name ?? p.email }))}
          currentUserId={profile.id}
          today={todayInputValue()}
        />
      </Card>
    </>
  );
}
