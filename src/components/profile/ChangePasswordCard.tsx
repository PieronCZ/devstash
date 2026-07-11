"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { changePasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldErrors = Partial<
  Record<"currentPassword" | "password" | "confirmPassword", string>
>;

const EMPTY_FORM = { currentPassword: "", password: "", confirmPassword: "" };

export function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function reset() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setPending(false);
  }

  function toggle() {
    if (open) reset();
    setSuccess(false);
    setOpen((prev) => !prev);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        currentPassword: flattened.currentPassword?.[0],
        password: flattened.password?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
      });
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormError(data?.error ?? "Couldn't change your password. Please try again.");
        setPending(false);
        return;
      }

      reset();
      setOpen(false);
      setSuccess(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-sm font-semibold">Password</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Change the password you use to sign in.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggle}>
          {open ? "Cancel" : "Change password"}
        </Button>
      </div>

      {success ? (
        <p className="mt-4 text-sm text-emerald-500" role="status">
          Your password has been updated.
        </p>
      ) : null}

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 border-t border-border pt-6"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              Current password
            </label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={update("currentPassword")}
              aria-invalid={!!fieldErrors.currentPassword}
              required
            />
            {fieldErrors.currentPassword ? (
              <p className="text-xs text-destructive">{fieldErrors.currentPassword}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              New password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={update("password")}
              aria-invalid={!!fieldErrors.password}
              required
            />
            {fieldErrors.password ? (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm new password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              aria-invalid={!!fieldErrors.confirmPassword}
              required
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
            ) : null}
          </div>

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-fit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            Update password
          </Button>
        </form>
      ) : null}
    </div>
  );
}
