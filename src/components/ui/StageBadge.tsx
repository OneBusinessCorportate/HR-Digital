import { STAGE_COLORS, STAGE_SHORT_LABELS, type Stage } from "@/lib/domain/funnel";

export function StageBadge({ stage, full = false }: { stage: Stage; full?: boolean }) {
  return (
    <span className={`chip ${STAGE_COLORS[stage]}`}>
      {full ? STAGE_SHORT_LABELS[stage] : STAGE_SHORT_LABELS[stage]}
    </span>
  );
}
