"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LoaderCircle } from "lucide-react";

import { credentialsSchema } from "@/lib/validations/auth";
import { formatRetryAfter } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// GitHub wordmark — lucide v1 dropped brand icons, so inline the SVG.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

interface SignInFormProps {
  callbackUrl: string;
}

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [pending, setPending] = useState(false);
  const [githubPending, setGithubPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverified(false);

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Enter a valid email and password.");
      return;
    }

    setPending(true);
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      // Correct password but unverified email — point them to verification
      // rather than the generic invalid-credentials message.
      if (result.code === "email_not_verified") {
        setUnverified(true);
      } else if (result.code?.startsWith("rate_limited")) {
        // The exact seconds-to-wait is embedded as `rate_limited_<seconds>`
        // (see RateLimitError in auth.ts).
        const seconds = Number(result.code.split("_").pop());
        setError(
          Number.isFinite(seconds) && seconds > 0
            ? `Too many attempts. Please try again in ${formatRetryAfter(seconds)}.`
            : "Too many attempts. Please try again later.",
        );
      } else {
        setError("Invalid email or password.");
      }
      setPending(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={githubPending || pending}
        onClick={() => {
          setGithubPending(true);
          signIn("github", { callbackUrl });
        }}
      >
        {githubPending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <GithubIcon className="size-4" />
        )}
        Sign in with GitHub
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {unverified ? (
          <div
            className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            role="alert"
          >
            Please verify your email before signing in.{" "}
            <Link
              href={`/check-email?email=${encodeURIComponent(email)}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Resend the link
            </Link>
            .
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending || githubPending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
