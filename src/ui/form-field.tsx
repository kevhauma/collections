import type { ReactNode } from "react";
import { cn } from "./cn";

export type ControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: true; "aria-required"?: true };

type FormFieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  // Marks a required field: an asterisk, plus this word (e.g. "required") for screen readers.
  required?: string;
  className?: string;
  // Spread these onto the control: <FormField …>{(control) => <Input {...control} name="title" />}</FormField>
  children: (control: ControlProps) => ReactNode;
};

const messageStyles = { error: "font-bold text-red-pen", hint: "text-sm text-ink-soft" };

// An asterisk for sighted users, the word for screen readers. Nothing for an optional field.
export const RequiredMark = ({ word }: { word?: string }) =>
  word && (
    <>
      <span aria-hidden="true"> *</span>
      <span className="sr-only"> {word}</span>
    </>
  );

// Wires label, hint and error to the control without hooks, so it stays a server component. The error is read
// first, so a screen reader announces it with the field.
export const FormField = ({ id, label, hint, error, required, className, children }: FormFieldProps) => {
  const texts = { error, hint };
  const messages = (["error", "hint"] as const)
    .map((kind) => ({ id: `${id}-${kind}`, kind, text: texts[kind] }))
    .filter((message) => message.text);
  return (
    <div className={cn("grid gap-1", className)}>
      <label htmlFor={id} className="font-bold">
        {label}
        <RequiredMark word={required} />
      </label>
      {children({
        id,
        "aria-describedby": messages.map((message) => message.id).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required === undefined ? undefined : true,
      })}
      {messages.map((message) => (
        <p key={message.id} id={message.id} className={messageStyles[message.kind]}>
          {message.text}
        </p>
      ))}
    </div>
  );
};
