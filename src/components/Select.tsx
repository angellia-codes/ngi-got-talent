import { ChevronDown } from "lucide-react";

export const inputClass =
  "min-h-11 w-full rounded-button border border-glass-border bg-glass-standard px-3 font-sans text-body text-text-on-glass placeholder:text-text-on-glass/35";

export function Select({
  id,
  value,
  onChange,
  placeholder,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass + " appearance-none pr-10" + (value ? "" : " text-text-on-glass/35")}
      >
        <option value="" disabled className="bg-bg-base text-text-on-glass">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-base text-text-on-glass">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={18}
        strokeWidth={2}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-on-glass/50"
      />
    </div>
  );
}
