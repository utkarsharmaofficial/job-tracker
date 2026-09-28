"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Briefcase, LayoutDashboard, Settings } from "lucide-react";
import { SyncButton } from "./SyncButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:flex-col md:items-stretch md:border-r md:border-b-0 md:py-5">
      <div className="mr-auto flex items-center gap-2 px-2 md:mr-0 md:mb-6">
        <div className="grid size-7 place-items-center rounded-lg bg-accent text-accent-ink">
          <Briefcase className="size-4" />
        </div>
        <span className="text-sm font-semibold whitespace-nowrap">Job Tracker</span>
      </div>
      <nav className="flex gap-1 md:flex-col">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-2 md:mt-auto md:flex-col md:items-stretch">
        <SyncButton />
        <ThemeToggle />
      </div>
    </aside>
  );
}
