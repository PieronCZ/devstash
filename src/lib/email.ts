import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend's shared onboarding sender — works without a verified domain, but in
// sandbox mode only delivers to the Resend account owner's address. Swap for a
// verified-domain sender once one is set up.
const FROM = "DevStash <onboarding@resend.dev>";

/**
 * Send the account email-verification message. `origin` is the request origin
 * (e.g. https://devstash.app) so the link is absolute and environment-correct
 * without depending on a separate base-URL env var.
 */
export async function sendVerificationEmail(
  to: string,
  token: string,
  origin: string,
): Promise<void> {
  const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your DevStash email",
    text: `Welcome to DevStash!\n\nConfirm your email address to activate your account:\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.`,
    html: verificationEmailHtml(verifyUrl),
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Send the password-reset message. `origin` is the request origin so the link
 * is absolute and environment-correct. The link targets the reset *page*
 * (not an API route) where the user enters a new password.
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string,
  origin: string,
): Promise<void> {
  const resetUrl = `${origin}/reset-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your DevStash password",
    text: `Someone requested a password reset for your DevStash account.\n\nReset your password:\n${resetUrl}\n\nThis link expires in 24 hours. If you didn't request this, you can safely ignore this email — your password won't change.`,
    html: passwordResetEmailHtml(resetUrl),
  });

  if (error) {
    throw new Error(error.message);
  }
}

function verificationEmailHtml(verifyUrl: string): string {
  return `
  <div style="background:#0a0a0a;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;color:#e5e5e5;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#fafafa;">Verify your email</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
        Welcome to DevStash! Confirm your email address to activate your account and start stashing your snippets, prompts, and commands.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#fafafa;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
        Verify email
      </a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#737373;">
        This link expires in 24 hours. If the button doesn't work, paste this URL into your browser:<br />
        <span style="color:#a3a3a3;word-break:break-all;">${verifyUrl}</span>
      </p>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#737373;">
        If you didn't create a DevStash account, you can safely ignore this email.
      </p>
    </div>
  </div>`;
}

function passwordResetEmailHtml(resetUrl: string): string {
  return `
  <div style="background:#0a0a0a;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;color:#e5e5e5;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#fafafa;">Reset your password</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
        We received a request to reset the password for your DevStash account. Click below to choose a new one.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#fafafa;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
        Reset password
      </a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#737373;">
        This link expires in 24 hours. If the button doesn't work, paste this URL into your browser:<br />
        <span style="color:#a3a3a3;word-break:break-all;">${resetUrl}</span>
      </p>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#737373;">
        If you didn't request a password reset, you can safely ignore this email — your password won't change.
      </p>
    </div>
  </div>`;
}
