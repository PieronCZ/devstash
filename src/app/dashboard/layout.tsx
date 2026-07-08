import { TopBar } from "@/components/dashboard/TopBar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r p-4">
        <h2 className="text-lg font-semibold">Sidebar</h2>
      </aside>
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
