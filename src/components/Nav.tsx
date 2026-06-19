"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "首页", icon: "~" },
  { href: "/echo", label: "Echo", icon: ">" },
  { href: "/memory", label: "记忆", icon: "#" },
  { href: "/relationship", label: "关系", icon: "&" },
  { href: "/life-chart", label: "命谱", icon: "*" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:w-56 md:h-screen bg-[#111] border-t md:border-t-0 md:border-r border-[#222] z-50">
      <nav className="flex md:flex-col md:pt-8">
        <div className="hidden md:block px-6 pb-6">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--accent-light)]">
            Echo Self
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">数字分身</p>
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 md:flex-none flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-3 md:px-6 md:py-2.5 text-sm transition-colors ${
                isActive
                  ? "text-[var(--accent-light)] bg-[#1a1a1a]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="text-base md:text-sm font-mono">{link.icon}</span>
              <span className="text-[10px] md:text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
