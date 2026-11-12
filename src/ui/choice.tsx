import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode };

// A checkbox is its own label, so it doesn't go inside FormField.
export const Checkbox = ({ label, className, ...props }: CheckboxProps) => (
  <label className={cn("inline-flex min-h-10 cursor-pointer items-center gap-2", className)}>
    <input type="checkbox" className="ink-check" {...props} />
    {label}
  </label>
);

type RadioGroupProps = {
  legend: ReactNode;
  name: string;
  options: Array<{ value: string; label: ReactNode }>;
  defaultValue?: string;
  required?: boolean;
  className?: string;
};

export const RadioGroup = ({ legend, name, options, defaultValue, required, className }: RadioGroupProps) => (
  <fieldset className={cn("grid gap-1", className)}>
    <legend className="mb-1 font-bold">{legend}</legend>
    {options.map((option) => (
      <label key={option.value} className="inline-flex min-h-10 cursor-pointer items-center gap-2">
        <input
          type="radio"
          className="ink-check"
          name={name}
          value={option.value}
          defaultChecked={option.value === defaultValue}
          required={required}
        />
        {option.label}
      </label>
    ))}
  </fieldset>
);
