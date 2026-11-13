import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { RequiredMark } from "./form-field";

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
  // Like FormField: `requiredWord` marks the legend ("*" plus the word for screen readers), `error` shows under it.
  // `id` goes on the fieldset, so an error summary can link to it.
  requiredWord?: string;
  error?: ReactNode;
  id?: string;
  className?: string;
};

const GroupError = ({ id, error }: { id: string; error?: ReactNode }) =>
  error && (
    <p id={id} className="font-bold text-red-pen">
      {error}
    </p>
  );

export const RadioGroup = ({ legend, name, options, defaultValue, required, requiredWord, error, id, className }: RadioGroupProps) => (
  <fieldset
    id={id}
    aria-describedby={error ? `${name}-error` : undefined}
    className={cn("grid gap-1", className)}
  >
    <legend className="mb-1 font-bold">
      {legend}
      <RequiredMark word={requiredWord} />
    </legend>
    <GroupError id={`${name}-error`} error={error} />
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
