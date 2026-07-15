"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  key: string;
  placeholder: string;
  options: FilterOption[];
}

const PERIODS: FilterOption[] = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "all", label: "Всё время" },
  { value: "custom", label: "Период" },
];

export function FilterBar({
  showPeriod = true,
  selects = [],
  showSearch = false,
}: {
  showPeriod?: boolean;
  selects?: FilterSelect[];
  showSearch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const period = params.get("period") ?? "month";

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      {showPeriod ? (
        <div>
          <label className="label">Период</label>
          <select className="input min-w-[140px]" value={period} onChange={(e) => setParam("period", e.target.value)}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showPeriod && period === "custom" ? (
        <>
          <div>
            <label className="label">С</label>
            <input
              type="date"
              className="input"
              defaultValue={params.get("from") ?? ""}
              onChange={(e) => setParam("from", e.target.value)}
            />
          </div>
          <div>
            <label className="label">По</label>
            <input
              type="date"
              className="input"
              defaultValue={params.get("to") ?? ""}
              onChange={(e) => setParam("to", e.target.value)}
            />
          </div>
        </>
      ) : null}

      {showSearch ? (
        <div className="min-w-[200px] flex-1">
          <label className="label">Поиск</label>
          <input
            type="search"
            className="input"
            placeholder="Имя, телефон, email…"
            defaultValue={params.get("q") ?? ""}
            onChange={(e) => setParam("q", e.target.value)}
          />
        </div>
      ) : null}

      {selects.map((s) => (
        <div key={s.key}>
          <label className="label">{s.placeholder}</label>
          <select
            className="input min-w-[150px]"
            value={params.get(s.key) ?? ""}
            onChange={(e) => setParam(s.key, e.target.value)}
          >
            <option value="">Все</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
