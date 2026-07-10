"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { registerSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: flattened.name?.[0],
        email: flattened.email?.[0],
        password: flattened.password?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
      });
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormError(data?.error ?? "Registration failed. Please try again.");
        setPending(false);
        return;
      }

      // Account created — the user must verify their email before signing in.
      // Send them to the "check your email" page instead of auto sign-in.
      router.push(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
    } catch {
      setFormError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={form.name}
          onChange={update("name")}
          aria-invalid={!!fieldErrors.name}
          required
        />
        {fieldErrors.name ? (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update("email")}
          aria-invalid={!!fieldErrors.email}
          required
        />
        {fieldErrors.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
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
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
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

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
