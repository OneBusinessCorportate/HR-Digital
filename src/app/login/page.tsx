import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход — OneBusiness Рекрутинг" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            OB
          </div>
          <h1 className="text-xl font-semibold text-slate-900">OneBusiness Рекрутинг</h1>
          <p className="mt-1 text-sm text-slate-500">Платформа управления наймом</p>
        </div>
        <div className="card p-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Демо-доступ: inga.demo@ob.local / admin.demo@ob.local / manager.demo@ob.local — пароль{" "}
          <code className="rounded bg-slate-100 px-1">Demo1234!</code>
        </p>
      </div>
    </main>
  );
}
