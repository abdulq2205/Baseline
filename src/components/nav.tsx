"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTES = [
  { href: "/", label: "Dashboard" },
  { href: "/assess", label: "Assessment" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex gap-1">
      {ROUTES.map(({ href, label }) => {
        // "/" would otherwise prefix-match every route.
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
