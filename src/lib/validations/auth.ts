import { z } from "zod";

// Shared email/password rules, reused by sign-in (Credentials authorize) and
// the registration route so validation stays consistent.
export const emailSchema = z.string().trim().toLowerCase().email();
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

// Credentials sign-in payload (email + password only).
export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Registration payload, with confirmPassword matching enforced.
export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// Forgot-password request — email only.
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset-password payload: the emailed token plus the new password (confirmed).
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
