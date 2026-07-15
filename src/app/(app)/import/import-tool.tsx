"use client";

import { useState, useTransition } from "react";
import { previewImport, commitImport, type ImportResult } from "@/app/actions/import";
import type { ImportPreview } from "@/lib/domain/import";
import { IMPORT_TEMPLATE_HEADERS } from "@/lib/domain/import";

const TEMPLATE = [
  IMPORT_TEMPLATE_HEADERS.join(","),
  "Иван Иванов,+37400000000,ivan@example.com,@ivan,Менеджер,Заявка,Тест,85,,Хороший контакт,,",
].join("\n");

export function ImportTool() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const t = await file.text();
    setText(t);
    setPreview(null);
    setResult(null);
  };

  const runPreview = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        setPreview(await previewImport(text));
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const runImport = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await commitImport(text);
        setResult(r);
        if (r.ok) setPreview(await previewImport(text));
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Данные для импорта (CSV)</h2>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={downloadTemplate}>Скачать шаблон</button>
            <label className="btn-secondary cursor-pointer">
              Загрузить файл
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </div>
        </div>
        <textarea
          className="input font-mono text-xs"
          rows={8}
          placeholder={TEMPLATE}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
            setResult(null);
          }}
        />
        <p className="mt-2 text-xs text-slate-400">
          Обязательная колонка — «ФИО». Поддерживаются: Телефон, Email, Telegram, Должность, Источник, Статус, Результат теста, Дата собеседования, Заметки, Итог, Испытательный срок.
        </p>
        <div className="mt-3 flex gap-2">
          <button className="btn-secondary" onClick={runPreview} disabled={pending || !text.trim()}>
            {pending ? "Обработка…" : "Предпросмотр"}
          </button>
          <button className="btn-primary" onClick={runImport} disabled={pending || !preview || preview.importable === 0}>
            Импортировать ({preview?.importable ?? 0})
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {result?.ok ? (
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Импортировано: <b>{result.imported}</b>. Пропущено дубликатов: {result.skippedDuplicates}. Невалидных строк: {result.invalid}.
        </div>
      ) : null}

      {preview ? (
        <div className="card p-5">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Всего строк" value={preview.total} />
            <Stat label="Валидных" value={preview.validCount} />
            <Stat label="Дубликатов" value={preview.duplicateCount} />
            <Stat label="К импорту" value={preview.importable} accent />
          </div>
          <div className="scroll-x">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Строка</th>
                  <th className="py-2">ФИО</th>
                  <th className="py-2">Статус</th>
                  <th className="py-2">Примечание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="py-2 text-slate-400">{r.rowNumber}</td>
                    <td className="py-2 text-slate-700">{r.data?.full_name ?? "—"}</td>
                    <td className="py-2">
                      {!r.valid ? (
                        <span className="chip bg-rose-100 text-rose-700 border-rose-200">ошибка</span>
                      ) : r.isDuplicate ? (
                        <span className="chip bg-amber-100 text-amber-700 border-amber-200">дубликат</span>
                      ) : (
                        <span className="chip bg-brand-100 text-brand-700 border-brand-200">импорт</span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-slate-500">
                      {r.error ?? (r.duplicateReasons.length ? r.duplicateReasons.join(", ") : "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-brand-200 bg-brand-50" : "border-slate-100"}`}>
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
