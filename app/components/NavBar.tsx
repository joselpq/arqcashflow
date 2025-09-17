"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't show navigation for landing page, login, or register pages
  if (!session && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return null;
  }

  if (!session) return null;

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/contracts", label: "Contratos" },
    { href: "/receivables", label: "Recebíveis" },
    { href: "/expenses", label: "Despesas" },
    { href: "/alerts", label: "Alertas" },
    { href: "/ai-chat", label: "🤖 Assistente IA" }
  ];

  return (
    <nav className="bg-white border-b border-neutral-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-neutral-900 rounded flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">A</span>
                </div>
                <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">ArqCashflow</h1>
              </div>
            </div>
            <div className="hidden sm:ml-12 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "border-neutral-900 text-neutral-900"
                      : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <span className="text-sm text-neutral-500">
                {session.user?.email}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden border-t border-neutral-200/60 bg-white">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "text-neutral-900 bg-neutral-100"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}