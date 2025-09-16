"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const navItems = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/contracts", label: "Contratos", icon: "📝" },
    { href: "/receivables", label: "Recebíveis", icon: "💰" },
    { href: "/expenses", label: "Despesas", icon: "💸" },
    { href: "/alerts", label: "Alertas", icon: "🚨" },
    { href: "/ai-chat", label: "Assistente IA", icon: "🤖" }
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <h1 className="text-xl font-bold text-neutral-900 tracking-tight">ArqCashflow</h1>
              </div>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? "bg-primary-light text-primary border border-primary/20 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  <span className="mr-2 text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <span className="text-sm text-neutral-500 font-medium">
                {session.user?.email}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <span className="mr-1.5">↗️</span>
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden border-t border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                pathname === item.href
                  ? "bg-primary-light text-primary border border-primary/20"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}