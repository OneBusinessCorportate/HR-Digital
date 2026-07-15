import Link from "next/link";
import { type ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function SectionCard({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title || actions ? (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={`card flex h-full flex-col justify-between p-4 transition ${
        href ? "hover:border-brand-300 hover:shadow" : ""
      } ${accent ? "bg-brand-50 border-brand-200" : ""}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  className = "bg-slate-100 text-slate-700 border-slate-200",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`chip ${className}`}>{children}</span>;
}

/** "25% — 5 из 20" with an inline progress bar. */
export function RatioBar({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
