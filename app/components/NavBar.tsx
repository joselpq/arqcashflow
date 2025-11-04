"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getProfessionTerminology, type ProfessionTerminology } from "@/lib/professions";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profession, setProfession] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Fetch team profession for terminology (with localStorage caching)
  useEffect(() => {
    if (session?.user?.email) {
      // Check localStorage cache first
      const cachedProfession = localStorage.getItem('userProfession');
      if (cachedProfession) {
        console.log('[NavBar] Using cached profession:', cachedProfession)
        setProfession(cachedProfession);
      }

      // Fetch fresh data in background
      console.log('[NavBar] Fetching team profession...')
      fetch('/api/user/team')
        .then(res => {
          console.log('[NavBar] API response status:', res.status)
          return res.json()
        })
        .then(data => {
          console.log('[NavBar] Team data:', data)
          if (data.team?.profession) {
            console.log('[NavBar] Setting profession to:', data.team.profession)
            setProfession(data.team.profession);
            // Cache in localStorage
            localStorage.setItem('userProfession', data.team.profession);
          } else {
            console.log('[NavBar] No profession in team data, defaulting to architecture')
            localStorage.setItem('userProfession', 'arquitetura');
          }
        })
        .catch(err => console.error('[NavBar] Failed to fetch team profession:', err));
    }
  }, [session]);

  const handleLogout = async () => {
    // Clear cached profession on logout
    localStorage.removeItem('userProfession');
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Don't show navigation on public/auth pages (regardless of session state)
  if (pathname === "/login" || pathname === "/register" || pathname === "/onboarding") {
    return null;
  }

  // Don't show navigation on landing page when not authenticated
  if (!session && pathname === "/") {
    return null;
  }

  if (!session) return null;

  // Get profession-aware terminology
  const terminology = getProfessionTerminology(profession);
  console.log('[NavBar] Current profession:', profession)
  console.log('[NavBar] Terminology for contracts:', terminology.contracts)

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/projetos", label: terminology.contracts }, // Pacientes for medicina, Contratos for arquitetura
    { href: "/recebiveis", label: "Recebíveis" },
    { href: "/despesas", label: "Despesas" },
    { href: "/ai-chat", label: "Assistente IA" }
  ];

  return (
    <nav ref={navRef} className="bg-white border-b border-neutral-200/60 sticky top-0 z-50">
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
            <div className="hidden lg:ml-12 lg:flex lg:space-x-8">
              {navItems.map((item) => {
                const isActive = item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-neutral-900 text-neutral-900"
                        : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden lg:flex lg:items-center lg:space-x-4">
              <span className="text-sm text-neutral-500">
                {session.user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                Sair
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {/* Hamburger icon */}
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200/60 bg-white animate-in slide-in-from-top-2 duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-neutral-900 bg-neutral-100"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            {/* Mobile user info and logout */}
            <div className="border-t border-neutral-200/60 pt-4 pb-3">
              <div className="px-3">
                <div className="text-sm text-neutral-500 mb-3">
                  {session.user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-sm text-neutral-600 hover:text-neutral-900 py-2"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}