import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create account · DevStash",
};

export default async function RegisterPage() {
  // Already authenticated — no need to register.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start stashing your snippets, prompts, and commands
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
