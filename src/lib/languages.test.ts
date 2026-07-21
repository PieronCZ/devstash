import { describe, expect, it } from "vitest";

import {
  LANGUAGES,
  defaultLanguageForType,
  getLanguageLabel,
} from "./languages";

describe("LANGUAGES", () => {
  it("has unique ids", () => {
    const ids = LANGUAGES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes plaintext and bash", () => {
    const ids = LANGUAGES.map((l) => l.id);
    expect(ids).toContain("plaintext");
    expect(ids).toContain("bash");
  });
});

describe("getLanguageLabel", () => {
  it("returns the label for a known id", () => {
    expect(getLanguageLabel("typescript")).toBe("TypeScript");
    expect(getLanguageLabel("bash")).toBe("Bash");
    expect(getLanguageLabel("csharp")).toBe("C#");
  });

  it("falls back to the raw value for an unknown id", () => {
    expect(getLanguageLabel("brainfuck")).toBe("brainfuck");
  });

  it("returns Plain Text for empty/null/undefined", () => {
    expect(getLanguageLabel("")).toBe("Plain Text");
    expect(getLanguageLabel(null)).toBe("Plain Text");
    expect(getLanguageLabel(undefined)).toBe("Plain Text");
  });
});

describe("defaultLanguageForType", () => {
  it("defaults commands to bash", () => {
    expect(defaultLanguageForType("command")).toBe("bash");
  });

  it("leaves other types unset", () => {
    expect(defaultLanguageForType("snippet")).toBe("");
    expect(defaultLanguageForType("note")).toBe("");
    expect(defaultLanguageForType("prompt")).toBe("");
  });
});
