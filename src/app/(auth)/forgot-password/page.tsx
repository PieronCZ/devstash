import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot password · DevStash",
};

export default async function ForgotPasswordPage() {
  // Already authenticated — no need to reset from here.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return <ForgotPasswordForm />;
}
