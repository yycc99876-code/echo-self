"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "首页", meta: "Overview", icon: "ES" },
  { href: "/echo", label: "Echo", meta: "Digital self", icon: "EC" },
  { href: "/memory", label: "Memory", meta: "Archive", icon: "MM" },
  { href: "/relationship", label: "Relationship", meta: "Map", icon: "RM" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-5 py-6 md:block">
      <Link href="/" className="block rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <div className="font-editorial text-2xl text-[var(--text-primary)]">Echo Self</div>
        <div className="mt-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
          Life Chart Avatar
          <br />
          private memory dossier
        </div>
      </Link>

      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 transition ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-soft)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="font-label flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-[10px]">
                {link.icon}
              </span>
              <span>
                <span className="block text-sm">{link.label}</span>
                <span className="block text-[11px] text-[var(--text-faint)]">{link.meta}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-5 right-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--archive-soft)] p-4">
        <div className="font-label text-[11px] text-[var(--archive)]">PRIVATE ARCHIVE</div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
          持续记录，长期对话，真实理解会随着时间形成。
        </p>
      </div>
    </aside>
  );
}
