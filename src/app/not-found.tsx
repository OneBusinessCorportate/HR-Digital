import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <p className="text-slate-600">Страница или кандидат не найдены.</p>
      <Link href="/dashboard" className="btn-primary">
        На дашборд
      </Link>
    </main>
  );
}
