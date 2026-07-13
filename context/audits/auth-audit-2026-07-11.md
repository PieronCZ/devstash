# DevStash Auth Security Audit

**Date:** 2026-07-11
**Scope:** NextAuth v5 (Credentials + GitHub), registration, email verification, forgot/reset password, change password, account deletion, profile page, route-protection proxy.
**Method:** Manual code review of `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `src/lib/tokens.ts`, `src/lib/email.ts`, `src/lib/auth-flags.ts`, `src/lib/validations/auth.ts`, everything under `src/app/api/auth/*` and `src/app/api/account/*`, `src/app/(auth)/*`, `src/app/profile/page.tsx`, `src/components/auth/*`, `src/components/profile/*`, `src/lib/db/profile.ts`. External behavior claims (Next.js router semantics, Host-header handling, password-reset-poisoning pattern) verified via web search before being reported.

Items NextAuth/Auth.js v5 already handles correctly (CSRF on its own routes, session cookie flags, GitHub OAuth state/PKCE, JWT signing, NextAuth session expiry/rotation) are out of scope and not reported below.

---

## Critical

None found.

---

## High

### H1 — Host-header–controlled origin used to build password-reset and email-verification links (link/token poisoning)

**Files:**
- `src/app/api/auth/register/route.ts:59`
- `src/app/api/auth/forgot-password/route.ts:42`
- `src/app/api/auth/resend-verification/route.ts:49`
- `src/app/api/auth/verify-email/route.ts:14` (redirect target reuses the same untrusted origin)

**Issue:** All four routes build the absolute URL embedded in the emailed link from `new URL(request.url).origin`, i.e. straight from the incoming request's `Host` (or `X-Forwarded-Host`, depending on proxy config) header, with no allow-list check against the app's real domain:

```ts
// forgot-password/route.ts
await sendPasswordResetEmail(email, token, new URL(request.url).origin);
```

This is the textbook setup for a **password-reset-poisoning / Host-header-injection** attack (OWASP: "Testing for Host Header Injection"; PortSwigger: "Password reset poisoning"). If the deployment (reverse proxy, load balancer, or `next start` without strict `Host` pinning) forwards an attacker-supplied `Host`/`X-Forwarded-Host` value through to the route handler, an attacker can:
1. POST to `/api/auth/forgot-password` with the victim's email and a spoofed `Host: attacker-controlled.example`.
2. The server emails the *victim's real inbox* a legitimate-looking reset link whose domain is `attacker-controlled.example`, containing the real, valid, high-entropy reset token.
3. If the victim clicks it, the attacker's clone site harvests the token from the URL and replays it against the real API (`POST https://devstash.app/api/auth/reset-password`) to set the victim's password to a value the attacker controls — full account takeover.

The same mechanism against `register`/`resend-verification` lets an attacker cause the app to send a victim an "verify your email" link pointing at an attacker-hosted page (phishing / credential-harvesting vector, and a way to keep an account permanently unverifiable if the attacker intercepts and discards the token).

Exploitability depends on hosting: a `next start` deployment behind a permissive proxy is fully exposed; Vercel's own routing binds a project to specific domains, which reduces (but per Vercel/Next.js's own tracked issues, does not always eliminate — see `x-forwarded-host` mismatch discussions) the risk for production custom domains. Regardless of current hosting, the code has no defense of its own.

**Fix:** Introduce a fixed, server-only `APP_URL` (or reuse `NEXTAUTH_URL`) environment variable set to the canonical app origin, and use that instead of `request.url` for every emailed link:

```ts
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
await sendPasswordResetEmail(email, token, APP_URL);
```

Do this in `register/route.ts`, `forgot-password/route.ts`, `resend-verification/route.ts`, and the redirect built in `verify-email/route.ts`. Never derive security-sensitive URLs from request headers.

---

## Medium

### M1 — Timing side-channel enables account enumeration in credentials `authorize`

**File:** `src/auth.ts:39-45`

```ts
const user = await prisma.user.findUnique({ where: { email } });
if (!user?.passwordHash) return null;                       // fast path
const passwordMatches = await bcrypt.compare(password, user.passwordHash); // slow path
if (!passwordMatches) return null;
```

**Issue:** `bcrypt.compare` (12 rounds) only executes when a credentials account with a `passwordHash` exists. For an unknown email or an OAuth-only account, the function returns `null` immediately with no hashing work. This produces a measurable latency gap (bcrypt at cost 12 typically costs on the order of 100+ ms; the short-circuit path is sub-millisecond) between "this email has a credentials account" and "it doesn't" — even though both cases surface the same generic "Invalid email or password" message in `SignInForm`. An attacker scripting repeated sign-in attempts and measuring response time can enumerate registered accounts, defeating the intent of the generic error message.

**Fix:** Always pay the same cost. Run a dummy `bcrypt.compare(password, DUMMY_HASH)` against a fixed, precomputed hash when the user doesn't exist or has no `passwordHash`, so the code path takes constant time regardless of account existence:

```ts
const DUMMY_HASH = "$2a$12$" + "a".repeat(53); // precomputed, unused hash
if (!user?.passwordHash) {
  await bcrypt.compare(password, DUMMY_HASH);
  return null;
}
```

### M2 — Timing side-channel enables account enumeration via awaited transactional email send

**Files:** `src/app/api/auth/forgot-password/route.ts:39-46`, `src/app/api/auth/resend-verification/route.ts:46-53`

**Issue:** Both endpoints are documented as enumeration-safe because they always return the same generic 200 body. However, the Resend API call is only made — and only *awaited* before responding — on the branch where the account exists (and, for resend-verification, is still unverified):

```ts
if (user?.passwordHash) {
  try {
    const token = await createPasswordResetToken(email);
    await sendPasswordResetEmail(email, token, ...); // network round-trip to Resend
  } catch (err) { console.error(...); }
}
return genericOk();
```

The non-existent-account branch returns immediately; the existing-account branch waits on an outbound network call to a third-party API, which is typically hundreds of milliseconds — far larger and more reliably measurable than the bcrypt gap in M1. This defeats the generic-response design and lets an attacker enumerate which emails have a credentials account (`forgot-password`) or an unverified credentials account (`resend-verification`) purely from response latency.

**Fix:** Don't let response timing depend on whether the email was sent. Either (a) fire-and-forget the send (don't `await` it in the request/response path — e.g. `void sendPasswordResetEmail(...)`, or use Next.js's `after()` to run it post-response), or (b) perform an equivalent-cost no-op / dummy await on the negative branch so both paths take the same wall-clock time.

### M3 — No session invalidation after password change or reset

**Files:** `src/auth.ts:58-69` (jwt/session callbacks), `src/app/api/auth/reset-password/route.ts`, `src/app/api/auth/change-password/route.ts`

**Issue:** Sessions use the JWT strategy. The `jwt`/`session` callbacks only ever copy `user.id` onto the token at sign-in and never re-validate anything against the current DB row on subsequent requests:

```ts
jwt({ token, user }) {
  if (user) token.id = user.id;
  return token;
},
session({ session, token }) {
  if (token.id) session.user.id = token.id as string;
  return session;
},
```

Because nothing ties a JWT's continued validity to the user's current password, a JWT issued *before* a password reset/change remains fully valid until its own natural expiry (NextAuth's default JWT session `maxAge` is 30 days), even after the account owner uses "Forgot password" or "Change password" specifically because they suspect their account/session was compromised. Concrete scenario: an attacker obtains a valid session cookie (leaked cookie, shared device, XSS elsewhere in the app); the legitimate user notices something is wrong and resets their password through the proper flow — the attacker's already-issued session keeps working regardless, since `reset-password`/`change-password` only touch `User.passwordHash`, not anything session-related.

**Fix:** Add a `passwordChangedAt` (or a monotonically increasing `tokenVersion`) column on `User`, bump it in both `reset-password` and `change-password`, embed it in the JWT at sign-in, and have the `jwt` callback compare it against the DB value (re-fetching periodically or on a short interval) — reject/refresh stale tokens. Alternatively, switch to `session.strategy: "database"` so sessions can be revoked server-side (e.g. `prisma.session.deleteMany({ where: { userId } })`) on password change.

---

## Low

### L1 — No rate limiting on abuse-prone auth endpoints

**Files:** `src/app/api/auth/register/route.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/resend-verification/route.ts`, `src/auth.ts` (credentials `authorize`)

**Issue:** None of register, forgot-password, resend-verification, or credentials sign-in enforce any per-IP/per-account request throttling. This is a known, previously-documented limitation of the codebase (see `context/current-feature.md` history for the forgot-password and email-verification phases), not a regression. It leaves the endpoints open to email-bombing (repeated forgot-password/resend-verification calls against one victim inbox), credential-stuffing against `authorize`, and brute-force registration probing (mitigated somewhat by the token's 256-bit entropy, so token guessing itself is not practical).

**Fix:** Add IP- and/or account-scoped rate limiting (e.g. Upstash/Vercel KV-backed token bucket, or a simple DB-backed counter) in front of these four routes. Calibrated as Low/informational per project convention since it's a known, deferred item rather than a newly discovered flaw — but should be picked up before the app leaves the "everyone gets everything" development stage.

### L2 — Unvalidated `callbackUrl` used for a client-side post-login redirect (needs manual verification)

**File:** `src/components/auth/SignInForm.tsx:47-66`

**Issue:** `callbackUrl` is read from the sign-in page's search params (attacker-craftable via a link like `/sign-in?callbackUrl=<value>`) and, on successful credentials sign-in, passed straight to `router.push(callbackUrl)` with no check that it's an internal, relative path:

```ts
const result = await signIn("credentials", { email, password, redirect: false });
...
router.push(callbackUrl);
```

This bypasses NextAuth's own redirect-URL validation (its default `redirect` callback restricts `signIn`-initiated redirects to same-origin URLs) entirely, because this path never goes through NextAuth's server-side redirect — it's a plain client `router.push`. The GitHub OAuth button (`signIn("github", { callbackUrl })`) is *not* affected, since that redirect is handled by NextAuth itself.

Current Next.js documentation explicitly calls passing a non-internal `href` to `router.push()` unsupported/invalid, which suggests this may not currently produce a working cross-origin navigation in practice — I could not confirm exploitability without a live browser test, so this is reported as a hardening gap rather than a confirmed open redirect. Regardless of current framework behavior, there's no validation guarding this input today.

**Fix:** Before calling `router.push(callbackUrl)`, verify the value is a same-origin relative path (e.g. `callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")`), falling back to `/dashboard` otherwise.

### L3 — Email-verification link is a state-changing GET, vulnerable to premature consumption by link-scanning proxies

**File:** `src/app/api/auth/verify-email/route.ts:8-16`

**Issue:** Verification is consumed on `GET /api/auth/verify-email?token=...`, which mutates state (deletes the token, sets `emailVerified`) as a side effect of a GET request. Many corporate mail gateways, antivirus products, and webmail providers (e.g. Outlook Safe Links, some antispam scanners) automatically prefetch links found in incoming email to scan them for malware — this would silently consume the token before the real user ever clicks, leaving them looking at an "invalid/expired" result and needing to request a new link. This is a design contrast with the reset-password flow, which correctly separates the GET (render form only) from the POST that actually consumes the token — the verification flow should follow the same pattern.

**Fix:** Make `/api/auth/verify-email` render a confirmation page/button that submits a `POST` to actually consume the token (mirroring the reset-password page/API split), instead of consuming it as a side effect of the `GET`.

---

## Passed Checks

- ✅ **Password hashing** — bcrypt at cost factor 12 is used consistently everywhere a password is written or compared: `register/route.ts:39`, `reset-password/route.ts:39`, `change-password/route.ts:58`, seed script, and `auth.ts:44` for comparison. All comparisons use `bcrypt.compare` (constant-time), never `===` on hashes.
- ✅ **Token entropy** — `randomBytes(32).toString("hex")` (`src/lib/tokens.ts:19`) yields 256 bits of entropy for both verification and reset tokens, far above the 128-bit bar; no `Math.random()`/timestamp-based tokens anywhere in the flow.
- ✅ **Token expiration is enforced at consumption**, not just stored — `consumeVerificationToken` (`tokens.ts:48`) and `consumePasswordResetToken` (`tokens.ts:84`) both check `record.expires < new Date()` before treating the token as valid.
- ✅ **Single-use tokens, deleted atomically on consumption** — both consume functions `deleteMany` the token by its unique value immediately after lookup, *including on the expired path*, so an expired token can never be replayed even if the expiry check fires after the delete (`tokens.ts:46`, `82`).
- ✅ **Reset vs. verification namespacing is correctly enforced** — reset tokens are stored with a `reset:` prefixed identifier; `consumeVerificationToken` explicitly rejects any identifier containing `:` (`tokens.ts:44`), and `consumePasswordResetToken` explicitly requires the `reset:` prefix (`tokens.ts:80`). A token submitted to the wrong endpoint is left untouched (not burned) for the correct one, matching the documented design in `context/current-feature.md`.
- ✅ **Tokens aren't logged** — the only `console.error` calls in the auth email paths log the Resend SDK's error object, never the token itself.
- ✅ **`passwordHash` never leaves the server** — excluded from every Prisma `select` that reaches a client response (`register/route.ts:50`), and on the profile page it's fetched server-side only to derive a boolean (`profile/page.tsx:36,46`), never rendered or returned.
- ✅ **`change-password`** is session-guarded via `auth()`, verifies the current password with `bcrypt.compare` before allowing a change, and correctly rejects OAuth-only accounts (no `passwordHash`) with a safe, generic error (`change-password/route.ts:16,43-48,50`).
- ✅ **`account/delete`** is session-guarded and scoped strictly to `session.user.id` via `deleteMany({ where: { id: session.user.id } })` — no request-body id is ever trusted, so there's no IDOR; cascading FKs clean up owned data. Client-side "type DELETE to confirm" is UX friction only, not relied on for authorization (correctly enforced server-side by the session check).
- ✅ **Profile reads are scoped to the authenticated user** — `ProfilePage` and `getProfileStats(userId)` both key off `session.user.id`, never a client-supplied id; no other user's data is reachable through this page.
- ✅ **`proxy.ts`** correctly protects both `/dashboard` and `/profile` prefixes using the edge-safe, adapter-free config, redirecting unauthenticated users with a preserved `callbackUrl`.
- ✅ **Input validation** — every route body is Zod-validated (`register`, `forgot-password`, `reset-password`, `change-password`, `resend-verification`), and email normalization (`trim().toLowerCase()`) is applied via one shared `emailSchema` used consistently at both write time and lookup time, preventing case/whitespace account-duplication or bypass.
- ✅ **`authorize` correctly gates unverified credentials accounts** behind `EMAIL_VERIFICATION_ENABLED`, and the `EmailNotVerifiedError` is only ever thrown *after* the password has already been confirmed correct — so it cannot be used as a pre-auth account-existence oracle.
- ✅ **GitHub OAuth redirect** (`signIn("github", { callbackUrl })`) goes through NextAuth's own `redirect` callback, which enforces same-origin by default — this path is not subject to L2.
- ✅ **`register`'s duplicate-account disclosure** (`409 "An account with this email already exists"`) is a deliberate, industry-standard UX tradeoff for a registration form, not a defect — distinct from the enumeration-sensitive `forgot-password`/`resend-verification` endpoints, which correctly return generic bodies (aside from the timing gap in M2).

---

## Verdict

No critical, immediately-exploitable-from-anywhere issues were found, and the token lifecycle (generation, expiry, single-use, namespacing) is implemented correctly and is the strongest part of this codebase. The most important item to fix is **H1** (Host-header-derived links used for password reset / verification emails), since it's a well-understood, high-impact vulnerability class that's cheap to close with a fixed `APP_URL` env var. The Medium findings (timing-based enumeration, no session invalidation post password-change) are real but require more effort/attacker sophistication to exploit and can be scheduled as follow-up hardening rather than blockers.
