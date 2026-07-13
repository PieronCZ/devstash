import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatFileSize, formatRetryAfter, relativeTime } from "@/lib/format";

describe("relativeTime", () => {
  const NOW = new Date("2026-07-13T12:00:00.000Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  it("shows 'Just now' within the first minute", () => {
    expect(relativeTime(ago(30_000))).toBe("Just now");
  });

  it("shows minutes under an hour", () => {
    expect(relativeTime(ago(5 * minute))).toBe("5m ago");
  });

  it("shows hours under a day", () => {
    expect(relativeTime(ago(3 * hour))).toBe("3h ago");
  });

  it("shows 'Yesterday' between one and two days", () => {
    expect(relativeTime(ago(day + hour))).toBe("Yesterday");
  });

  it("shows days under a week", () => {
    expect(relativeTime(ago(4 * day))).toBe("4d ago");
  });

  it("shows weeks beyond a week", () => {
    expect(relativeTime(ago(3 * week))).toBe("3w ago");
  });

  it("clamps future dates to 'Just now'", () => {
    expect(relativeTime(ago(-hour))).toBe("Just now");
  });
});

describe("formatFileSize", () => {
  it("formats bytes under 1 KB", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes rounded", () => {
    expect(formatFileSize(253_952)).toBe("248 KB");
  });

  it("formats megabytes with one decimal", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatRetryAfter", () => {
  it("formats seconds only", () => {
    expect(formatRetryAfter(45)).toBe("45 seconds");
  });

  it("uses singular for one second", () => {
    expect(formatRetryAfter(1)).toBe("1 second");
  });

  it("formats a whole minute", () => {
    expect(formatRetryAfter(60)).toBe("1 minute");
  });

  it("formats minutes and seconds", () => {
    expect(formatRetryAfter(92)).toBe("1 minute 32 seconds");
  });

  it("rounds fractional seconds up and floors to at least one second", () => {
    expect(formatRetryAfter(0)).toBe("1 second");
    expect(formatRetryAfter(44.2)).toBe("45 seconds");
  });
});
