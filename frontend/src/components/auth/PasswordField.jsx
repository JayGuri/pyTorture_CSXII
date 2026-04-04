import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * @param {{
 *   id?: string;
 *   label: string;
 *   name: string;
 *   value: string;
 *   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
 *   autoComplete?: string;
 *   placeholder?: string;
 *   required?: boolean;
 *   minLength?: number;
 *   variant?: "light" | "dark";
 * }} props
 */
export default function PasswordField({
  id: idProp,
  label,
  name,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "••••••••",
  required = true,
  minLength,
  variant = "light",
}) {
  const genId = useId();
  const id = idProp || genId;
  const [visible, setVisible] = useState(false);

  const inputBase =
    variant === "light"
      ? "w-full rounded-sm border border-fateh-border bg-fateh-paper/50 py-3 pl-4 pr-12 text-fateh-ink outline-none transition focus:border-fateh-gold"
      : "w-full rounded-sm border border-white/15 bg-white/5 py-3 pl-4 pr-12 text-fateh-paper outline-none transition focus:border-fateh-gold";

  const labelCls =
    variant === "light"
      ? "mb-2 block text-[0.72rem] uppercase tracking-[0.12em] text-fateh-muted"
      : "mb-2 block text-[0.72rem] uppercase tracking-[0.12em] text-white/50";

  const btnCls =
    variant === "light"
      ? "absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-fateh-muted transition hover:bg-fateh-paper hover:text-fateh-ink"
      : "absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-white/45 transition hover:bg-white/10 hover:text-white";

  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          maxLength={128}
          className={inputBase}
          placeholder={placeholder}
          spellCheck={false}
        />
        <button
          type="button"
          className={btnCls}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}
