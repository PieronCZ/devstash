import { afterEach, describe, expect, it, vi } from "vitest";

import { isEmailVerificationEnabled, isRateLimitingEnabled } from "@/lib/auth-flags";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isEmailVerificationEnabled", () => {
  it("defaults to enabled when unset", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "");
    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it.each(["false", "0", "off", "no", "FALSE", " Off "])(
    "is disabled for falsey value %j",
    (value) => {
      vi.stubEnv("EMAIL_VERIFICATION_ENABLED", value);
      expect(isEmailVerificationEnabled()).toBe(false);
    },
  );

  it("stays enabled for any other value", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "true");
    expect(isEmailVerificationEnabled()).toBe(true);
  });
});

describe("isRateLimitingEnabled", () => {
  it("defaults to on in production when unset", () => {
    vi.stubEnv("RATE_LIMIT_ENABLED", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isRateLimitingEnabled()).toBe(true);
  });

  it("defaults to off outside production when unset", () => {
    vi.stubEnv("RATE_LIMIT_ENABLED", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isRateLimitingEnabled()).toBe(false);
  });

  it.each(["true", "1", "on", "yes"])("forces on for truthy value %j", (value) => {
    vi.stubEnv("RATE_LIMIT_ENABLED", value);
    vi.stubEnv("NODE_ENV", "development");
    expect(isRateLimitingEnabled()).toBe(true);
  });

  it.each(["false", "0", "off", "no"])("forces off for falsey value %j", (value) => {
    vi.stubEnv("RATE_LIMIT_ENABLED", value);
    vi.stubEnv("NODE_ENV", "production");
    expect(isRateLimitingEnabled()).toBe(false);
  });
});
