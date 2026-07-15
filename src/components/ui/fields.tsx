import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input ${props.className ?? ""}`} />;
}

export function Select({
  options,
  placeholder,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select {...props} className={`input ${props.className ?? ""}`}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
