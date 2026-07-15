"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/domain/constants";
import type { Enums } from "@/lib/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  editorOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: "▤" },
  { href: "/funnel", label: "Воронка", icon: "▦" },
  { href: "/candidates", label: "Кандидаты", icon: "☰" },
  { href: "/interviews", label: "Собеседования", icon: "◷" },
  { href: "/reports", label: "Отчёты", icon: "▣" },
  { href: "/import", label: "Импорт", icon: "⬆", editorOnly: true },
];

export function Sidebar({
  role,
  fullName,
  email,
  canEdit,
}: {
  role: Enums<"hr_role">;
  fullName: string;
  email: string;
  canEdit: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.editorOnly || canEdit);

  const links = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="w-4 text-center">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-slate-100 pt-3">
      <div className="px-3 py-1">
        <p className="truncate text-sm font-medium text-slate-800">{fullName}</p>
        <p className="truncate text-xs text-slate-400">{email}</p>
        <p className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          {ROLE_LABELS[role]}
        </p>
      </div>
      <form action={signOut}>
        <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
          <span className="w-4 text-center">⏻</span> Выйти
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            OB
          </span>
          <span className="font-semibold text-slate-800">Рекрутинг</span>
        </Link>
        <button
          aria-label="Меню"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600"
        >
          ☰
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-4 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard" className="mb-6 hidden items-center gap-2 px-2 md:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            OB
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">OneBusiness</p>
            <p className="text-xs text-slate-400">Рекрутинг</p>
          </div>
        </Link>
        {links}
        {footer}
      </aside>
    </>
  );
}
