"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-rose-800">Что-то пошло не так</p>
      <p className="mt-1 max-w-md text-sm text-rose-600">{error.message || "Произошла ошибка при загрузке данных."}</p>
      <button onClick={reset} className="btn-primary mt-4">
        Попробовать снова
      </button>
    </div>
  );
}
