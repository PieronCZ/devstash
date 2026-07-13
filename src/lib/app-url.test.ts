import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppUrl } from "@/lib/app-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppUrl", () => {
  it("returns the configured APP_URL", () => {
    vi.stubEnv("APP_URL", "https://devstash.app");
    expect(getAppUrl()).toBe("https://devstash.app");
  });

  it("falls back to localhost when APP_URL is unset", () => {
    vi.stubEnv("APP_URL", undefined);
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
