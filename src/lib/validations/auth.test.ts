import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  credentialsSchema,
  emailSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("emailSchema", () => {
  it("trims and lowercases valid emails", () => {
    expect(emailSchema.parse("  User@Example.COM ")).toBe("user@example.com");
  });

  it("rejects malformed emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("credentialsSchema", () => {
  it("accepts an email and non-empty password", () => {
    const result = credentialsSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = credentialsSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Ada",
    email: "ada@example.com",
    password: "supersecret",
    confirmPassword: "supersecret",
  };

  it("accepts a matching, valid payload", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("flags mismatched confirmPassword on the confirm field", () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: "different" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects a blank name", () => {
    expect(registerSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires a token", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: "supersecret",
      confirmPassword: "supersecret",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const base = {
    currentPassword: "oldpassword",
    password: "newpassword",
    confirmPassword: "newpassword",
  };

  it("accepts a valid change", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it("rejects when the new password equals the current one", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "samepass1",
      password: "samepass1",
      confirmPassword: "samepass1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "password")).toBe(true);
    }
  });
});
