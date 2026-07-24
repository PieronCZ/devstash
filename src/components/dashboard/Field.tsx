import { cn } from "@/lib/utils";

// Shared uppercase field label for the item create/edit forms. `required` adds a
// red asterisk. Kept in one place so the two forms don't redeclare it.
export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
    >
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-destructive">
          *
        </span>
      ) : null}
    </label>
  );
}

// A labelled form field: the repeated `flex flex-col gap-1.5` wrapper + a
// FieldLabel, with the control(s) as children. Replaces the per-field wrapper
// both item forms hand-rolled for every field.
export function Field({
  label,
  htmlFor,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}
