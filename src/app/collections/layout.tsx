import { AppShell } from "@/components/dashboard/AppShell";

export default function CollectionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
