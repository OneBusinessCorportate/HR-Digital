import { requireEditor } from "@/lib/auth";
import { PageHeader } from "@/components/ui/primitives";
import { ImportTool } from "./import-tool";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireEditor();
  return (
    <>
      <PageHeader
        title="Импорт из таблицы"
        subtitle="Замена ручной Google-таблицы Инги. Предпросмотр → проверка → импорт без дубликатов."
      />
      <ImportTool />
    </>
  );
}
