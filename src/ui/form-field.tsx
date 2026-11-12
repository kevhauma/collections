import type { ReactNode } from "react";
import { cn } from "./cn";

type ControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

type FormFieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  // Spread these onto the control: <FormField …>{(control) => <Input {...control} name="title" />}</FormField>
  children: (control: ControlProps) => ReactNode;
};

const messageStyles = { error: "font-bold text-red-pen", hint: "text-sm text-ink-soft" };

// Wires label, hint and error to the control without hooks, so it stays a server component. The error is read
// first, so a screen reader announces it with the field.
export const FormField = ({ id, label, hint, error, className, children }: FormFieldProps) => {
  const texts = { error, hint };
  const messages = (["error", "hint"] as const)
    .map((kind) => ({ id: `${id}-${kind}`, kind, text: texts[kind] }))
    .filter((message) => message.text);
  return (
    <div className={cn("grid gap-1", className)}>
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": messages.map((message) => message.id).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {messages.map((message) => (
        <p key={message.id} id={message.id} className={messageStyles[message.kind]}>
          {message.text}
        </p>
      ))}
    </div>
  );
};
