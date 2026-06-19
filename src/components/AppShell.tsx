import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell">
      <Sidebar />
      <main className="min-h-screen md:pl-72">{children}</main>
    </div>
  );
}
