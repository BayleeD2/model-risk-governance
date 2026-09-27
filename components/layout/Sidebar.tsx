"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";

interface SidebarProps {
  orgName: string;
  userEmail: string;
}

const navItems = [
  { href: "/models", label: "Model Registry" },
];

export function Sidebar({ orgName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-zinc-200 bg-white">
      {/* App name */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-4">
        <span className="text-sm font-semibold text-zinc-900">Model Risk Governance</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Governance
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={[
                  "flex items-center rounded-md px-2 py-2 text-sm transition-colors",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                ].join(" ")}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-4">
        <p className="truncate text-xs font-medium text-zinc-900">{orgName}</p>
        <p className="truncate text-xs text-zinc-500">{userEmail}</p>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Compliance disclaimer */}
      <p className="border-t border-zinc-100 px-4 py-3 text-[10px] leading-tight text-zinc-400">
        Analytical output only. Not legal or regulatory advice.
      </p>
    </aside>
  );
}
