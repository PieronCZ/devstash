/**
 * The canonical, server-only origin for this deployment (e.g.
 * https://devstash.app). Single source of truth for every absolute URL that
 * leaves the server — emailed verification/reset links and their redirects.
 *
 * Security: never derive these URLs from the incoming request's `Host` /
 * `X-Forwarded-Host` header. A spoofed header would let an attacker point a
 * victim's real reset/verification link at an attacker-controlled domain
 * (password-reset / link poisoning). Read a fixed env var instead.
 */
export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}
